import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    host: true, // binds to 0.0.0.0 so it’s reachable from the host
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
  base: '/appsettings-to-docker-compose/',
})
