import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const value = loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL?.trim()
  let site: URL | undefined
  if (value) {
    try {
      site = new URL(value)
      if (!['http:', 'https:'].includes(site.protocol) || site.username || site.password) throw new Error()
    } catch {
      throw new Error('VITE_SITE_URL must be an absolute HTTP(S) URL without credentials.')
    }
  }

  return {
    server: { port: 3000, strictPort: true },
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      {
        name: 'site-metadata',
        transformIndexHtml(html) {
          if (!site) return html
          return {
            html: html.replaceAll('content="/images/logo.png"', `content="${new URL('/images/logo.png', site).href}"`),
            tags: [
              { tag: 'link', attrs: { rel: 'canonical', href: site.href }, injectTo: 'head' },
              { tag: 'meta', attrs: { property: 'og:url', content: site.href }, injectTo: 'head' },
            ],
          }
        },
      },
    ],
  }
})
