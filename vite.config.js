import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import mkcert from 'vite-plugin-mkcert';
import { defineConfig } from 'vite';

export default defineConfig({ 
	plugins: [
		mkcert(),
		tailwindcss(), 
		sveltekit(),
		nodePolyfills({
			include: ['buffer', 'crypto', 'stream', 'util']
		})
	] 
});
