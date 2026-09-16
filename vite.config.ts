import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Die Seite liegt auf GitHub Pages unter /Ganz-schoen-clever/.
  // Für eigenes Hosting im Wurzelverzeichnis auf '/' ändern.
  base: '/Ganz-schoen-clever/',
})
