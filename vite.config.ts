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
    // module workers, so the thumbnail and export workers share the renderer code as imports
    worker: { format: 'es' },
    build: {
      // the webamp chunk is one prebuilt vendor module that cannot be split further, so the
      // default 500kB warning only ever fires for it and hides anything worth acting on
      chunkSizeWarningLimit: 1000,
      rolldownOptions: {
        output: {
          // Webamp is a ~940kB prebuilt bundle that never changes between deploys. Splitting
          // it off the editor keeps it cached across releases instead of being re-downloaded
          // whenever our own editor code changes. React is split for the same reason: it is
          // in the entry chunk, which every release invalidates.
          advancedChunks: {
            groups: [
              { name: 'webamp', test: /node_modules[\\/]webamp[\\/]/ },
              { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            ],
          },
        },
      },
    },
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
