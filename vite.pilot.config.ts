import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vite';
import { assertNoPublishedSecrets } from './scripts/ci/env-guard.mjs';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
  // Fail closed at the exact moment Vite would inline a VITE_ value into the
  // browser bundle. Shared with vite.config.ts and the deploy gate so one
  // implementation is proven, not three near-copies.
  assertNoPublishedSecrets({ rootDir });

  const isProduction = process.env.VITE_DATA_MODE === 'supabase';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
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
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
