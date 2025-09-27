import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills, type PolyfillOptions } from 'vite-plugin-node-polyfills'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

type ShimId = 'buffer' | 'global' | 'process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = __dirname

const nodePolyfillsFix = (options?: PolyfillOptions): Plugin => {
  const plugin = nodePolyfills(options)
  const baseResolveId = plugin.resolveId

  const enhancedPlugin: Plugin = {
    ...(plugin as Plugin),
    resolveId: (function (this: any, source, importer, opts) {
      const match = /^vite-plugin-node-polyfills\/shims\/(buffer|global|process)$/.exec(source)
      if (match) {
        const shim = match[1] as ShimId
        return path.resolve(projectRoot, `node_modules/vite-plugin-node-polyfills/shims/${shim}/dist/index.cjs`)
      }

      if (typeof baseResolveId === 'function') {
        return baseResolveId.call(this, source, importer, opts)
      }

      if (baseResolveId && typeof (baseResolveId as { handler?: unknown }).handler === 'function') {
        const handler = (baseResolveId as {
          handler: (
            this: unknown,
            source: string,
            importer: string | undefined,
            options: unknown,
          ) => unknown
        }).handler
        return handler.call(this, source, importer, opts) as ReturnType<typeof handler>
      }

      return null
    }) as Plugin['resolveId'],
  }

  return enhancedPlugin
}

const aztecBrowserStubs = (): Plugin => {
  const stubs = new Map<string, string>([
    ['utils/ssh_agent.js', path.resolve(projectRoot, 'src/polyfills/sshAgent.ts')],
    ['testing/port_allocator.js', path.resolve(projectRoot, 'src/polyfills/portAllocator.ts')],
  ])

  return {
    name: 'aztec-browser-stubs',
    load(id) {
      const normalised = id.split(path.sep).join('/')
      if (!normalised.includes('/@aztec/')) {
        return null
      }

      for (const [suffix, replacement] of stubs.entries()) {
        if (normalised.endsWith(suffix)) {
          return fs.readFileSync(replacement, 'utf8')
        }
      }

      return null
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, '')

  return {
    base: './',
    logLevel: process.env.CI ? 'error' : 'info',
    plugins: [
      react(),
      aztecBrowserStubs(),
      nodePolyfillsFix({
        include: ['buffer', 'process', 'path', 'stream', 'util'],
        protocolImports: true,
        globals: {
          Buffer: true,
          process: true,
        },
      }),
    ],
    resolve: {
      alias: {
        colorette: path.resolve(projectRoot, 'src/polyfills/colorette.ts'),
        '@aztec/accounts/dest/utils/ssh_agent.js': path.resolve(projectRoot, 'src/polyfills/sshAgent.ts'),
      },
    },
    define: {
      'process.env': {
        LOG_LEVEL: env.LOG_LEVEL,
      },
    },
  }
})
