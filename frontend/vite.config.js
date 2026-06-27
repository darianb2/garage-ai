import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Dev: Vite serves the React app on :5173 and proxies /api/* to Flask on :5000,
// so the browser talks to one origin. Prod: `npm run build` emits static files
// that Flask serves. The Flask backend + data engine stay the source of truth.
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
