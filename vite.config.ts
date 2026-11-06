import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {defineConfig} from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.VITE_DATA_MODE === 'supabase';

export default defineConfig(() => {
  // Order matters: Rollup's alias plugin uses the first matching entry, so the
  // specific data/adapter specifiers must precede the generic '@' root alias.
  const alias: Record<string, string> = {
    './AuthModal': isProduction
      ? path.resolve(rootDir, 'src/components/AuthModal.production.tsx')
      : path.resolve(rootDir, 'src/components/AuthModal.demo.tsx'),
    '@/data/initialData': isProduction
      ? path.resolve(rootDir, 'src/data/initialData.production.ts')
      : path.resolve(rootDir, 'src/data/initialData.demo.ts'),
    '@/data/demoTenants': isProduction
      ? path.resolve(rootDir, 'src/data/demoTenants.production.ts')
      : path.resolve(rootDir, 'src/data/demoTenants.demo.ts'),
    '@': path.resolve(rootDir, 'src'),
  };

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
