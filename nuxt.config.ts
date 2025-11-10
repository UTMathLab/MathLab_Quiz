import { writeFileSync } from 'fs'
import { join } from 'path'

export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  css:[ 'katex/dist/katex.min.css', "@/assets/styles/common.scss"],

  vite: {
    assetsInclude: ['**/*.woff2']
  },

  hooks: {
    'generate:done'() {
      const distDir = join(process.cwd(), 'dist')
      writeFileSync(join(distDir, '.nojekyll'), '')
    }
  },

  ssr: false,

  app: {
    baseURL: '/Mathlab-Quiz/',  
    buildAssetsDir: 'assets/',
    head: {                               
      base: { href: '/Mathlab-Quiz/' }
    }
  }
})
