import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'graphics/logo_512x512.png'],
      manifest: {
        name: 'Bad Habbit',
        short_name: 'BadHabbit',
        description: 'Earn your rewards. No more untracked stuff.',
        theme_color: '#EDE8E2',
        background_color: '#EDE8E2',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'graphics/logo_512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
