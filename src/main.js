/**
 * Client entry point.
 *
 * When the browser loads this file, the imports from `./api.remote.js`
 * resolve to the CLIENT-TRANSFORMED version — fetch wrappers that POST
 * to /__remote/{hash}/{name}.
 *
 * You can verify this by opening the Network tab: every call to
 * addTodo(), toggleTodo(), deleteTodo() creates a POST request.
 */
import { getTodos, addTodo, toggleTodo, deleteTodo } from './api.remote.js';

const app = document.querySelector('#app');

function render(todos) {
	app.innerHTML = `
    <h1>Remote Functions Demo</h1>
    <p class="subtitle">
      Each action below calls a server function via <code>POST /__remote/{hash}/{name}</code>
      <br>Open the Network tab to see it in action.
    </p>

    <form id="add-form">
      <input type="text" id="new-todo" placeholder="What needs to be done?" autocomplete="off" />
      <button type="submit">Add</button>
    </form>

    <ul id="todo-list">
      ${todos
				.map(
					(todo) => `
        <li class="${todo.done ? 'done' : ''}">
          <label>
            <input type="checkbox" ${todo.done ? 'checked' : ''} data-toggle="${todo.id}" />
            <span>${todo.text}</span>
          </label>
          <button data-delete="${todo.id}" title="Delete">&times;</button>
        </li>
      `
				)
				.join('')}
    </ul>

    ${todos.length === 0 ? '<p class="empty">No todos yet. Add one above!</p>' : ''}
  `;

	// Wire up the add form
	document.querySelector('#add-form').addEventListener('submit', async (e) => {
		e.preventDefault();
		const input = document.querySelector('#new-todo');
		const text = input.value.trim();
		if (!text) return;

		input.disabled = true;
		const updated = await addTodo(text);
		render(updated);
	});

	// Wire up toggle checkboxes
	document.querySelectorAll('[data-toggle]').forEach((el) => {
		el.addEventListener('change', async () => {
			const id = Number(el.dataset.toggle);
			const updated = await toggleTodo(id);
			render(updated);
		});
	});

	// Wire up delete buttons
	document.querySelectorAll('[data-delete]').forEach((el) => {
		el.addEventListener('click', async () => {
			const id = Number(el.dataset.delete);
			const updated = await deleteTodo(id);
			render(updated);
		});
	});
}

// Initial load
 getTodos().then(
	todos => render(todos)
 )
