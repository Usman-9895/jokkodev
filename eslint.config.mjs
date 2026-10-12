import js from '@eslint/js';
import ts from 'typescript-eslint';
import next from '@next/eslint-plugin-next';
export default [
  { ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', '.cache/**', '**/generated/**', 'packages/api-client/src/schema.d.ts', 'frontend/next-env.d.ts'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  { files: ['frontend/**/*.{ts,tsx,js,mjs}'], plugins: { '@next/next': next }, rules: { ...next.configs.recommended.rules, ...next.configs['core-web-vitals'].rules }, settings: { next: { rootDir: 'frontend/' } } },
  { files: ['**/*.{mjs,ts,tsx}'], languageOptions: { globals: { process: 'readonly', console: 'readonly', URL: 'readonly', fetch: 'readonly', AbortSignal: 'readonly', Headers: 'readonly', Request: 'readonly', Response: 'readonly', setTimeout: 'readonly' } } }
];
