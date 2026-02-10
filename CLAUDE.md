# Remote Functions Demo

A minimal Vite application that demonstrates the SvelteKit "remote functions" pattern — writing server-side logic in `.remote.js` files that are transparently callable from the client via auto-generated fetch wrappers.

## Architecture Overview

The core idea: a single `.remote.js` source file is **transformed differently** depending on whether it is loaded on the server (SSR) or the client. On the server the real implementation runs directly; on the client the Vite plugin swaps it out for thin `fetch()` stubs that POST to the server.

```
Browser (client)                         Vite Dev Server
─────────────────                        ──────────────────
main.js                                  api.remote.js (real impl)
  └─ imports api.remote.js               in-memory todo store
       ↓ (plugin rewrites to stubs)
     fetch("/__remote/{hash}/{name}")  →  middleware handles POST
                                            ↓
                                          ssrLoadModule(api.remote.js)
                                            ↓
                                          executes command, returns JSON
```

## File Structure

```
├── index.html                   Entry HTML, loads /src/main.js as ESM
├── vite.config.js               Vite config — registers plugins
├── package.json                 Only dependency: vite ^6
│
├── plugins/
│   └── vite-plugin-remote.js    The core plugin (see below)
│
└── src/
    ├── main.js                  Client entry — imports from api.remote.js, renders todo UI
    ├── api.remote.js            Remote functions file — server-side todo CRUD logic
    └── runtime/
        ├── server.js            Server runtime — command() wraps functions with metadata
        └── client.js            Client runtime — command() returns fetch wrappers
```

## Key Components

### `plugins/vite-plugin-remote.js`

The Vite plugin that makes remote functions work. It has two responsibilities:

1. **`configureServer`** — Registers dev-server middleware on `POST /__remote/{hash}/{name}`. When a request arrives it uses `ssrLoadModule()` to load the real server module, finds the named export, calls it with the deserialized payload, and returns JSON (`{ type: "result", data }` or `{ type: "error", message, status }`).

2. **`transform`** — Intercepts `.remote.js` files:
   - **SSR path** (`opts.ssr === true`): returns the code unchanged so the server has the real implementations.
   - **Client path**: calls `ssrLoadModule()` to discover exported commands, then replaces the entire module with generated code like:
     ```js
     import { command } from '/src/runtime/client.js';
     export const addTodo = command('{hash}/addTodo');
     ```

A simple string hash function converts absolute file paths to short IDs used in the URL scheme.

### `src/runtime/server.js`

Exports `command(fn)`. Wraps the given function in a pass-through wrapper and attaches a non-enumerable `__` property (`{ type: 'command' }`) that the plugin reads to identify remote-callable exports.

### `src/runtime/client.js`

Exports `command(id)`. Returns an async function that `POST`s to `/__remote/{id}` with a JSON body `{ payload: arg }` and unwraps the response.

### `src/api.remote.js`

The application's remote functions. Imports `command` from `./runtime/server.js` and exports four commands operating on an in-memory todo array: `getTodos`, `addTodo`, `toggleTodo`, `deleteTodo`.

### `src/main.js`

Client entry point. Imports the four commands from `./api.remote.js` (which the plugin has rewritten to fetch stubs) and renders a simple todo-list UI that calls them on user interaction.

### `vite.config.js`

Registers two plugins:
- `remotePlugin()` — the remote functions plugin described above.
- `form-endpoint` — an inline plugin that adds a `POST /form` endpoint returning 200 (no body).

## Server Endpoints

| Method | Path | Source | Description |
|--------|------|--------|-------------|
| POST | `/__remote/{hash}/{name}` | `vite-plugin-remote.js` | Invokes a remote command by hash + export name |
| POST | `/form` | `vite.config.js` (inline plugin) | Returns 200 with empty body |

## Running

```sh
npm install
npm run dev
```

Opens a Vite dev server (default `http://localhost:5173`). The todo UI is served from `index.html`; all mutations go through remote function POST calls visible in the browser Network tab.
