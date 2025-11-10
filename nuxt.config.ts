// https://nuxt.com/docs/api/configuration/nuxt-config
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
      const distDir = join(process.cwd(), 'docs')
      writeFileSync(join(distDir, '.nojekyll'), '')
    }
  },
  devtools: { enabled: true },
  target: 'static',
  router: {
    base: '/Mathlab-Quiz/'
  },
  generate: {
    dir: 'docs', // 出力先フォルダを 'dist' から 'docs' に変更
    fallback: true, // SPAモード用に404.htmlを生成
  },
  ssr: false,
  app: {
    baseURL: '/Mathlab-Quiz/',
  }
});
