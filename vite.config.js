import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { defineConfig } from 'vite';

export default defineConfig({ 
	plugins: [
		tailwindcss(), 
		sveltekit(),
		nodePolyfills({
			include: ['buffer', 'crypto', 'stream', 'util']
		})
	] 
});
