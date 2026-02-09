/**
 * Remote functions file.
 *
 * This file is authored ONCE but runs in TWO different ways:
 *
 * - On the SERVER (SSR): The real `command()` from `./runtime/server.js`
 *   wraps each function and attaches metadata. The functions execute directly.
 *
 * - On the CLIENT: The Vite plugin REPLACES this entire file with fetch
 *   wrappers. The client never sees this code — it sees generated stubs like:
 *
 *     import { command } from '/src/runtime/client.js';
 *     export const addTodo = command('abc123/addTodo');
 *
 * This is the same pattern SvelteKit uses with `.remote.js` files.
 */
import { command } from './runtime/server.js';

// In-memory store (lives on the server process)
let todos = [
	{ id: 1, text: 'Learn about remote functions', done: true },
	{ id: 2, text: 'Build a Vite plugin', done: false },
	{ id: 3, text: 'Profit', done: false }
];

/**
 * Get all todos. Even though this is a "command" (POST) for simplicity,
 * in a real app like SvelteKit this would be a `query` (GET).
 */
export const getTodos = command(() => {
	return [...todos];
});

/**
 * Add a new todo and return the updated list.
 */
export const addTodo = command((text) => {
	const todo = { id: Date.now(), text, done: false };
	todos.push(todo);
	console.log(`  [server] Added todo: "${text}" (${todos.length} total)`);
	return [...todos];
});

/**
 * Toggle a todo's done status and return the updated list.
 */
export const toggleTodo = command((id) => {
	const todo = todos.find((t) => t.id === id);
	if (todo) {
		todo.done = !todo.done;
		console.log(`  [server] Toggled todo ${id}: done=${todo.done}`);
	}
	return [...todos];
});

/**
 * Delete a todo and return the updated list.
 */
export const deleteTodo = command((id) => {
	todos = todos.filter((t) => t.id !== id);
	console.log(`  [server] Deleted todo ${id} (${todos.length} remaining)`);
	return [...todos];
});
