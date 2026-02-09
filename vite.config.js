import { defineConfig } from 'vite';
import remotePlugin from './plugins/vite-plugin-remote.js';

export default defineConfig({
	plugins: [remotePlugin()]
});
