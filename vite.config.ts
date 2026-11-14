import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vite';
import { assertNoPublishedSecrets } from './scripts/ci/env-guard.mjs';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.VITE_DATA_MODE === 'supabase';

export default defineConfig(() => {
  // The same guard the supported config uses; a second config must not be a
  // bypass.
  assertNoPublishedSecrets({ rootDir });

  // Specific aliases must precede the generic '@' root alias.
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