import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const versionManifestPath = path.resolve(__dirname, 'public/version.json');
const versionManifest = JSON.parse(readFileSync(versionManifestPath, 'utf8'));
const siteVersion = String(versionManifest?.version || '').trim();

if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(siteVersion)) {
  throw new Error(`Invalid website version in ${versionManifestPath}. Expected x.y.z.`);
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const dataProvider = String(env.VITE_DATA_PROVIDER || '').trim().toLowerCase();

  if (mode === 'production' && dataProvider !== 'real') {
    throw new Error('Production builds require VITE_DATA_PROVIDER=real.');
  }

  if (mode === 'production' && !String(env.VITE_API_BASE_URL || '').trim()) {
    throw new Error('Production builds require VITE_API_BASE_URL.');
  }

  return {
    plugins: [react(), tailwindcss()],
    assetsInclude: ['**/*.PNG', '**/*.MP4'],
    define: {
      'process.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL),
      'process.env.VITE_APP_ENV': JSON.stringify(env.VITE_APP_ENV || mode),
      'import.meta.env.VITE_SITE_VERSION': JSON.stringify(siteVersion),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      // Keep React and React DOM on one physical module instance in dev/HMR.
      // Multiple instances make Zustand/react-i18next report Invalid hook call.
      dedupe: ['react', 'react-dom'],
    },
    build: {
      target: 'es2020',
      // Keep production output small and fast to parse in Android WebViews.
      minify: 'esbuild',
      cssMinify: 'esbuild',
      sourcemap: false,
      cssCodeSplit: true,
      assetsInlineLimit: 4096,
      chunkSizeWarningLimit: 700,
      esbuild: {
        legalComments: 'none',
        drop: mode === 'production' ? ['debugger'] : [],
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('@barba/core')) return 'transition-vendor';
            if (id.includes('react-router')) return 'router-vendor';
            if (id.includes('framer-motion')) return 'motion-vendor';
            if (id.includes('i18next')) return 'i18n-vendor';
            if (id.includes('zustand')) return 'state-vendor';
            if (id.includes('lucide-react')) return undefined;
            if (id.includes('react') || id.includes('scheduler')) return 'react-vendor';
            if (id.includes('axios')) return 'http-vendor';
            if (id.includes('clsx') || id.includes('tailwind-merge')) return 'ui-vendor';
            return undefined;
          },
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      port: 5173,
    },
  };
});
