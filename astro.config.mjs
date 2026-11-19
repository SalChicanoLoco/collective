import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://senacolectivo.com',
  output: 'static',
  build: {
    format: 'directory',
  },
});
