import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  base: "/",
  css: {
    postcss: './postcss.config.cjs',
  },
  server: {
    port: 3000,
    host: 'localhost',
  },
})
