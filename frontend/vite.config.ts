import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiProxy = () => ({
  target: 'http://localhost:3000',
  changeOrigin: true,
  bypass(req: any) {
    if (req.headers.accept?.includes('text/html')) {
      return '/index.html'
    }
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/users': apiProxy(),
      '/user': apiProxy(),
      '/templates': apiProxy(),
      '/template': apiProxy(),
      '/settings': apiProxy(),
      '/token-needed': apiProxy(),
      '/t': apiProxy(),
    },
  },
})
