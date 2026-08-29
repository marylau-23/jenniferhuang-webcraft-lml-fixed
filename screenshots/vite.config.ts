import { defineConfig } from 'vite';
import { resolve } from 'path';
import { existsSync } from 'fs';

export default defineConfig({
  plugins: [
    {
      name: 'rewrite-routes',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/work' || req.url === '/work/') {
            req.url = '/work.html';
          } else if (req.url === '/studio' || req.url === '/studio/') {
            req.url = '/studio.html';
          } else if (req.url === '/contact' || req.url === '/contact/') {
            req.url = '/contact.html';
          } else if (req.url === '/journal' || req.url === '/journal/') {
            req.url = '/journal.html';
          } else if (req.url === '/journal/horseyear' || req.url === '/journal/horseyear/') {
            req.url = '/journal/horseyear/index.html';
          } else if (req.url === '/sketch' || req.url === '/sketch/') {
            req.url = '/sketch.html';
          } else {
            // Project detail pages: /en/work/<slug> -> /en/work/<slug>/index.html
            // (Vite only auto-resolves the directory index when a trailing slash is
            // present; without this the clean URL falls back to the root homepage.)
            const m = req.url?.match(/^\/en\/work\/([a-z0-9-]+)\/?(?:[?#].*)?$/i);
            if (m && existsSync(resolve(__dirname, 'en/work', m[1], 'index.html'))) {
              req.url = `/en/work/${m[1]}/index.html`;
            }
          }
          next();
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        work: resolve(__dirname, 'work.html'),
        studio: resolve(__dirname, 'studio.html'),
        contact: resolve(__dirname, 'contact.html'),
        journal: resolve(__dirname, 'journal.html'),
        journalHorseyear: resolve(__dirname, 'journal/horseyear/index.html'),
        sketch: resolve(__dirname, 'sketch.html'),
        leetonpet: resolve(__dirname, 'en/work/leetonpet/index.html'),
        leafbiotech: resolve(__dirname, 'en/work/leafbiotech/index.html'),
        decentralgpt: resolve(__dirname, 'en/work/decentralgpt/index.html'),
        zaowujun: resolve(__dirname, 'en/work/zaowujun/index.html'),
      },
    },
  },
});
