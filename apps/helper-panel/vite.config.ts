import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  // Production serves the Helper as an isolated application within vozen.org.
  // Hash routing keeps deep links on this static document.
  base: command === 'serve' ? '/' : '/panel/helper-tracker/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
}));
