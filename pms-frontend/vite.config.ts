import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'favicon-compat',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/favicon.ico') {
            const svgPath = path.resolve(__dirname, 'public', 'favicon.svg')
            try {
              const svg = fs.readFileSync(svgPath)
              res.setHeader('Content-Type', 'image/svg+xml')
              res.end(svg)
              return
            } catch (e) {
              // If not found, continue to next middleware
            }
          }
          next()
        })
      },
      generateBundle() {
        try {
          const svgPath = path.resolve(__dirname, 'public', 'favicon.svg')
          const svg = fs.readFileSync(svgPath)
          this.emitFile({
            type: 'asset',
            name: 'favicon.ico',
            fileName: 'favicon.ico',
            source: svg,
          })
        } catch (e) {
          // Ignore if favicon.svg missing; build proceeds
        }
      },
    },
  ],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})


