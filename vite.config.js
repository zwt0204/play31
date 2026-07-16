import { defineConfig } from 'vite';

export default defineConfig({
  base: '/play31/',
  server: {
    allowedHosts: ['.trycloudflare.com', 'zwt.qzz.io']
  },
  preview: {
    allowedHosts: ['.trycloudflare.com', 'zwt.qzz.io']
  }
});
