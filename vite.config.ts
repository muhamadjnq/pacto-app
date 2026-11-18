import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// خروجی کاملاً محلی: هیچ کتابخانه‌ای هنگام اجرا از اینترنت گرفته نمی‌شود
export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'pacto-csp',
      transformIndexHtml(html) {
        const origin = new URL(process.env.PACTO_API_BASE || 'https://adpacto.com/api').origin;
        return html.replace('__CSP_CONNECT__', origin);
      },
    },
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    target: ['chrome80', 'es2020'],
    cssTarget: 'chrome80',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
  },
  define: {
    __API_BASE__: JSON.stringify(process.env.PACTO_API_BASE || 'https://adpacto.com/api'),
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '2.0.0'),
  },
});
