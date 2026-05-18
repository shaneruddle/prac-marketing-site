// NOTE: This file is for local development only.
// Production builds use scripts/build.js (Node + Firebase Admin SDK).
// Vite is NOT used in the CI/CD pipeline (see .github/workflows/firebase-hosting-deploy.yml).

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
