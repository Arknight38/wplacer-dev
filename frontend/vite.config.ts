import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.join(process.cwd(), '..'), '')
  const backendPort = env.PORT || '3000'
  const backendHost = env.HOST?.replace(/"/g, '') || '127.0.0.1'
  const frontendPort = env.FRONTEND_PORT || '5173'

  const apiProxy = () => ({
    target: `http://${backendHost}:${backendPort}`,
    changeOrigin: true,
    bypass(req: any) {
      if (req.headers.accept?.includes('text/html')) {
        return '/index.html'
      }
    }
  })

  return {
    plugins: [react()],
    server: {
      port: parseInt(frontendPort, 10),
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
  }
})
