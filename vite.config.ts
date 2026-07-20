import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      workbox: {
        // json incluye demo-semana.json, para que la semana de ejemplo cargue offline
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,json}'],
      },
      manifest: {
        name: 'Comidas de la semana',
        short_name: 'Comidas',
        description:
          'Planificador semanal de comidas para dos: recetas, nutrición y lista de la compra.',
        lang: 'es',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        background_color: '#f8f7f2',
        theme_color: '#4f6551',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
