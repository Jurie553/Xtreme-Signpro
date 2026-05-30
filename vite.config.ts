import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.APP_URL': JSON.stringify(env.APP_URL || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api/zoho-accounts/us': {
          target: 'https://accounts.zoho.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/zoho-accounts\/us/, '')
        },
        '/api/zoho-accounts/eu': {
          target: 'https://accounts.zoho.eu',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/zoho-accounts\/eu/, '')
        },
        '/api/zoho-accounts/in': {
          target: 'https://accounts.zoho.in',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/zoho-accounts\/in/, '')
        },
        '/api/zoho-accounts/au': {
          target: 'https://accounts.zoho.com.au',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/zoho-accounts\/au/, '')
        },
        '/api/zoho-accounts/jp': {
          target: 'https://accounts.zoho.co.jp',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/zoho-accounts\/jp/, '')
        },
        '/api/zoho-books/us': {
          target: 'https://www.zohoapis.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/zoho-books\/us\/api\/v3/, '/books/v3').replace(/^\/api\/zoho-books\/us/, '/books')
        },
        '/api/zoho-books/eu': {
          target: 'https://www.zohoapis.eu',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/zoho-books\/eu\/api\/v3/, '/books/v3').replace(/^\/api\/zoho-books\/eu/, '/books')
        },
        '/api/zoho-books/in': {
          target: 'https://www.zohoapis.in',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/zoho-books\/in\/api\/v3/, '/books/v3').replace(/^\/api\/zoho-books\/in/, '/books')
        },
        '/api/zoho-books/au': {
          target: 'https://www.zohoapis.com.au',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/zoho-books\/au\/api\/v3/, '/books/v3').replace(/^\/api\/zoho-books\/au/, '/books')
        },
        '/api/zoho-books/jp': {
          target: 'https://www.zohoapis.co.jp',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/zoho-books\/jp\/api\/v3/, '/books/v3').replace(/^\/api\/zoho-books\/jp/, '/books')
        }
      }
    },
  };
});
