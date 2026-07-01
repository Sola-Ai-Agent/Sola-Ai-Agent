import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3001,
        host: '0.0.0.0',
        proxy: {
          '/api-resend': {
            target: 'https://api.resend.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api-resend/, '')
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GOOGLE_CALENDAR_API_KEY': JSON.stringify(env.GOOGLE_CALENDAR_API_KEY),
        'process.env.GOOGLE_CALENDAR_CLIENT_ID': JSON.stringify(env.GOOGLE_CALENDAR_CLIENT_ID),
        'process.env.RESEND_API_KEY': JSON.stringify(env.RESEND_API_KEY),
        'process.env.SENDER_EMAIL': JSON.stringify(env.SENDER_EMAIL || 'onboarding@resend.dev')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
