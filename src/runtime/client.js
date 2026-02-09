/**
 * Client-side runtime for remote functions.
 *
 * This mirrors SvelteKit's client-side command() wrapper.
 * Instead of executing the function, it makes a POST fetch
 * to the server middleware at `/__remote/{hash}/{name}`.
 *
 * The Vite plugin rewrites client-side `.remote.js` imports to use
 * these wrappers instead of the real server implementations.
 */

/**
 * Creates a client-side command wrapper that calls the server via fetch.
 *
 * @param {string} id - The remote function ID in format "{hash}/{name}"
 * @returns {(arg?: any) => Promise<any>}
 */
export function command(id) {
	const fn = async (arg) => {
		const response = await fetch(`/__remote/${id}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ payload: arg })
		});

		const result = await response.json();

		if (result.type === 'error') {
			throw new Error(result.message);
		}

		return result.data;
	};

	return fn;
}
