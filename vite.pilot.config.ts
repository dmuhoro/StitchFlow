import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// Any variable with one of these prefixes is inlined into the browser bundle.
const PUBLIC_PREFIX = /^(VITE_|NEXT_PUBLIC_|REACT_APP_)/;
// A name that describes a credential must never carry a public prefix. This is
// deliberately name-based: the check must not need the secret's value to prove
// the secret is about to be published.
const SECRET_SHAPED =
  /(PASSWORD|PASSPHRASE|SECRET|SERVICE_ROLE|SERVICE_KEY|PRIVATE_KEY|ACCESS_KEY|CREDENTIAL|TOKEN|DATABASE_URL|POSTGRES|_DB_URL)/i;

/**
 * Refuse to build when a credential is about to be published.
 *
 * Vite inlines every `VITE_*` value into the client bundle, so a variable named
 * `VITE_SUPABASE_PASSWORD` is not a private setting with an unlucky prefix — it
 * is a password that ships to every visitor as soon as any code reads it. The
 * guard runs at config time, which is the real boundary: the build fails before
 * an artifact exists, so no later gate can be skipped to let it through.
 *
 * Operator credentials belong in ~/.config/stitchflow/ops.env (mode 600), which
 * Vite never loads. See docs/runbooks/agent-operating-guide.md.
 */
function refusePublishedSecrets(mode: string) {
  const env = loadEnv(mode, rootDir, '');
  const offenders = Object.keys(env).filter(
    key => PUBLIC_PREFIX.test(key) && SECRET_SHAPED.test(key.replace(PUBLIC_PREFIX, '')),
  );

  if (offenders.length > 0) {
    throw new Error(
      [
        'Refusing to build: these variables look like credentials but carry a public prefix,',
        'so Vite would inline them into the browser bundle:',
        ...offenders.map(key => `  - ${key}`),
        '',
        'Move the value to ~/.config/stitchflow/ops.env (mode 600) and delete it from every',
        '.env* file. Browser configuration may hold a publishable key, never a password,',
        'token, service-role key, or database URL.',
        'See docs/runbooks/agent-operating-guide.md.',
      ].join('\n'),
    );
  }
}

export default defineConfig(({ mode }) => {
  refusePublishedSecrets(mode);

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
