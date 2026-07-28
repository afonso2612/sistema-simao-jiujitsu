import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      manifest: {
        name: 'Ariramba Jiu-Jitsu School',

        short_name: 'Ariramba',

        theme_color: '#f59e0b',

        background_color: '#05070a',

        display: 'standalone',

        icons: [
          {
            src: '/logo.png',
            sizes: '192x192',
            type: 'image/png',
          },

          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
})