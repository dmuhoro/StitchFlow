import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {defineConfig} from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.VITE_DATA_MODE === 'supabase';

export default defineConfig(() => {
  const alias: Record<string, string> = {
    '@': path.resolve(rootDir, 'src'),
    './AuthModal': isProduction
      ? path.resolve(rootDir, 'src/components/AuthModal.production.tsx')
      : path.resolve(rootDir, 'src/components/AuthModal.demo.tsx'),
  };

  if (isProduction) {
    alias['@/data/initialData'] = path.resolve(rootDir, 'src/data/initialData.production.ts');
    alias['@/components/AuthModal'] = path.resolve(rootDir, 'src/components/AuthModal.production.tsx');
  } else {
    alias['@/data/initialData'] = path.resolve(rootDir, 'src/data/initialData.demo.ts');
    alias['@/components/AuthModal'] = path.resolve(rootDir, 'src/components/AuthModal.demo.tsx');
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias,
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
