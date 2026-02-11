/**
 * Vite Plugin for Remote Functions
 *
 * This plugin mirrors SvelteKit's `plugin_remote` approach:
 *
 * 1. `configureServer` — adds middleware to handle `/__remote/{hash}/{name}` POST requests
 * 2. `transform` — rewrites `.remote.js` files:
 *    - SSR: keeps the original code (server needs real implementation)
 *    - Client: replaces with fetch wrappers that POST to the server
 *
 * The key insight is that the SAME import (`./api.remote.js`) resolves to
 * different code depending on whether it's loaded on the server or the client.
 */

/**
 * Simple string hash (same idea as SvelteKit's hash() for remote file IDs)
 * @param {string} str
 * @returns {string}
 */
function hash(str) {
	let h = 5381;
	for (let i = 0; i < str.length; i++) {
		h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
	}
	return h.toString(36);
}

/**
 * @returns {import('vite').Plugin}
 */
export default function remotePlugin() {
	/** @type {import('vite').ViteDevServer} */
	let server;

	/** @type {Map<string, string>} hash -> absolute file path */
	const remoteModules = new Map();

	return {
		name: 'vite-plugin-remote',

		configureServer(devServer) {
			server = devServer;

			// ---------------------------------------------------------------
			// Middleware: handle POST /__remote/{hash}/{name}
			// This is the equivalent of SvelteKit's handle_remote_call()
			// ---------------------------------------------------------------
			devServer.middlewares.use(async (req, res, next) => {
				const match = req.url?.match(/^\/__remote\/([^/]+)\/([^/]+)/);
				if (!match || req.method !== 'POST') return next();

				const [, reqHash, name] = match;
				const filePath = remoteModules.get(reqHash);

				if (!filePath) {
					res.statusCode = 404;
					res.end(JSON.stringify({ type: 'error', message: 'Remote module not found', status: 404 }));
					return;
				}

				// Collect the request body
				let body = '';
				for await (const chunk of req) body += chunk;

				try {
					// Load the server module (this returns the REAL implementation,
					// because ssrLoadModule runs the SSR transform path)
					const mod = await devServer.ssrLoadModule(filePath);
					const fn = mod[name];


					const { payload } = JSON.parse(body || '{}');

					console.log(`[remote] ${name}(${payload !== undefined ? JSON.stringify(payload) : ''})`);

					const data = await fn(payload);

					res.setHeader('Content-Type', 'application/json');
					res.end(JSON.stringify({ type: 'result', data }));
				} catch (err) {
					console.error(`[remote] Error in ${name}:`, err);
					res.statusCode = 200; // SvelteKit also returns 200 + error payload
					res.setHeader('Content-Type', 'application/json');
					res.end(JSON.stringify({
						type: 'error',
						message: err instanceof Error ? err.message : 'Internal server error',
						status: 500
					}));
				}
			});
		},

		async transform(code, id, opts) {
			// Only process .remote.js files
			if (!id.endsWith('.remote.js')) return;

			const fileHash = hash(id);
			remoteModules.set(fileHash, id);

			// ---------------------------------------------------------------
			// SSR transform: keep original code as-is
			// The server needs the real command() functions with actual logic
			// ---------------------------------------------------------------
			if (opts?.ssr) {
				return;
			}

			// ---------------------------------------------------------------
			// Client transform: replace entire module with fetch wrappers
			// This mirrors SvelteKit's approach of generating:
			//   import * as __remote from '__sveltekit/remote';
			//   export const addTodo = __remote.command('hash/name');
			// ---------------------------------------------------------------
			if (!server) return;

			// Load the server module to discover its exports and their types
			const mod = await server.ssrLoadModule(id);

			const exports = Object.entries(mod)
				.filter(([, value]) => value?.__?.type === 'command')
				.map(([name]) => {
					return `export const ${name} = command('${fileHash}/${name}');`;
				});

			if (exports.length === 0) return;

			return {
				code: `import { command } from '/src/runtime/client.js';\n\n${exports.join('\n')}\n`
			};
		}
	};
}
