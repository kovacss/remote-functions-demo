# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # Client-side production build
npm run build-server # SSR build of api.remote.js
```

There are no tests or linting scripts.

## Architecture

The core idea: `.remote.js` files are **transformed differently** depending on the load context. On the server the real implementation runs; on the client the Vite plugin replaces the module with thin `fetch()` stubs.

```
Browser                                  Dev Server
──────────────────────────────────────── ─────────────────────────────────────
import { addTodo } from './api.remote'   api.remote.js (real in-memory impl)
  → plugin rewrites to:
    export const addTodo = command('{hash}/addTodo')
    (where command() is from client.js)

addTodo("Buy milk")
  → POST /__remote/{hash}/addTodo        middleware: ssrLoadModule(api.remote.js)
    body: { payload: "Buy milk" }          → executes fn, returns JSON result
```

### How the dual transform works (`plugins/vite-plugin-remote.js`)

The `transform` hook intercepts any file ending in `.remote.js`:

- **SSR path** (`opts.ssr === true`): returns the code unchanged — the server needs the real implementation.
- **Client path**: calls `ssrLoadModule()` on the same file to discover which exports have `value?.__?.type === 'command'`, then replaces the entire module with generated fetch-stub code pointing to `/__remote/{hash}/{name}`.

The hash is a deterministic djb2-style hash of the absolute file path, used in both the URL and the `remoteModules` map that resolves hashes back to file paths in the middleware.

### The `command()` duality (`src/runtime/`)

Two files export a function named `command` with different semantics:

- **`server.js`**: `command(fn)` wraps `fn` in a pass-through and attaches a non-enumerable `__: { type: 'command' }` property. This marker is how the plugin identifies remote-callable exports.
- **`client.js`**: `command(id)` returns an async function that POSTs to `/__remote/{id}` with `{ payload: arg }` and unwraps `{ type: 'result', data }` / `{ type: 'error', message }`.

When writing a new `.remote.js` file, only import from `./runtime/server.js` — the client-side swap is automatic.

### Adding a new remote function

1. In any `*.remote.js` file, import `command` from `./runtime/server.js` and export a wrapped function.
2. The plugin auto-discovers it at transform time via `ssrLoadModule` + the `__` marker check.
3. No registration or config change needed.
