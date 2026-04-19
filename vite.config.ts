import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    TanStackRouterVite({ routesDirectory: './src/client/routes', generatedRouteTree: './src/client/routeTree.gen.ts' }),
    tailwindcss(),
    react(),
  ],
  root: '.',
  build: {
    outDir: 'dist/client',
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/trpc': { target: 'http://localhost:3000', changeOrigin: true },
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})
