import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'], // Build for CommonJS and ES Modules
    dts: true,              // Generate TypeScript declaration files
    splitting: false,
    sourcemap: true,
    clean: true,
    external: ['react', 'next'], // Don't bundle React or Next
});