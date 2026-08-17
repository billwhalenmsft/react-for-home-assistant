import { defineConfig } from 'vite';

// Home Assistant loads a custom panel as a single ES module from /local (or a
// HACS-managed path). No code splitting, no hashed filenames — the URL in
// configuration.yaml has to stay stable.
export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  build: {
    lib: {
      entry: 'src/main.tsx',
      formats: ['es'],
      fileName: () => 'react-for-home-assistant.js',
    },
    rollupOptions: {
      // React is bundled in: HA's frontend does not provide it, and a panel
      // must be self-contained.
      output: { inlineDynamicImports: true },
    },
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    minify: 'esbuild',
  },
});
