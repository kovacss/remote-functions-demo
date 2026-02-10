import express from 'express';

const app = express();
app.use(express.json());
app.use(express.static('public'));

// In-memory store
let todos = [
	{ id: 1, text: 'Learn about remote functions', done: true },
	{ id: 2, text: 'Build a Vite plugin', done: false },
	{ id: 3, text: 'Profit', done: false }
];

// GET /api/todos
app.get('/api/todos', (req, res) => {
	res.json([...todos]);
});

// POST /api/todos
app.post('/api/todos', (req, res) => {
	const { text } = req.body;
	const todo = { id: Date.now(), text, done: false };
	todos.push(todo);
	console.log(`  [server] Added todo: "${text}" (${todos.length} total)`);
	res.json([...todos]);
});

// POST /api/todos/:id/toggle
app.post('/api/todos/:id/toggle', (req, res) => {
	const id = Number(req.params.id);
	const todo = todos.find((t) => t.id === id);
	if (todo) {
		todo.done = !todo.done;
		console.log(`  [server] Toggled todo ${id}: done=${todo.done}`);
	}
	res.json([...todos]);
});

// DELETE /api/todos/:id
app.delete('/api/todos/:id', (req, res) => {
	const id = Number(req.params.id);
	todos = todos.filter((t) => t.id !== id);
	console.log(`  [server] Deleted todo ${id} (${todos.length} remaining)`);
	res.json([...todos]);
});

// POST /form
app.post('/form', (req, res) => {
	res.sendStatus(200);
});

app.listen(3000, () => {
	console.log('Server running at http://localhost:3000');
});
