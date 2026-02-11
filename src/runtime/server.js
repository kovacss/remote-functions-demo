/**
 * Server-side runtime for remote functions.
 *
 * This mirrors SvelteKit's $app/server `command()` function.
 * It wraps user functions and attaches metadata (the `__` property)
 * so the Vite plugin can identify them during the transform step.
 *
 * On the server, calling a command executes the function directly.
 * On the client, the Vite plugin replaces this entire module with
 * fetch wrappers from `client.js`.
 */

/**
 * Creates a remote command.
 *
 * When imported on the server, calling the returned function executes `fn` directly.
 * When imported on the client, the Vite plugin replaces it with a fetch wrapper.
 *
 * @template T
 * @param {(...args: any[]) => T | Promise<T>} fn - The server-side implementation
 * @returns {(...args: any[]) => T | Promise<T>}
 */
export function command(fn) {
	// The wrapper just forwards the call — but it carries metadata
	// that the Vite plugin reads to know this is a "command"
	const wrapper = (...args) => fn(...args);


	return wrapper;
}
