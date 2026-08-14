/** Standalone Host library and Harness Web Client closure bundle. */

import { readFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { defineConfig } from 'tsdown'
import { transform } from 'lightningcss'

const PACKAGE_ID = 'dsh-observer'
const CSS_PREFIX = '\0dsh-observer-css:'
const CSS_SUFFIX = '.mjs'
const CLIENT_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form',
  '@deepseek-ai/dsh-client-runtime/client',
] as const

export default defineConfig([
  {
    name: PACKAGE_ID,
    entry: {
      index: 'src/index.ts',
      types: 'src/types.ts',
    },
    outDir: 'lib',
    format: 'esm',
    platform: 'node',
    target: 'node22',
    fixedExtension: false,
    dts: false,
    clean: false,
  },
  {
    name: `${PACKAGE_ID}/client`,
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2022',
    dts: false,
    sourcemap: true,
    clean: false,
    deps: {
      neverBundle: [...CLIENT_EXTERNALS],
      alwaysBundle: (id: string) => CLIENT_EXTERNALS.includes(id as typeof CLIENT_EXTERNALS[number])
        ? undefined
        : true,
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
    },
    plugins: [{
      name: 'dsh-observer-client-purity',
      resolveId(source: string) {
        if (!source.startsWith('@deepseek-ai/')) return null
        if (CLIENT_EXTERNALS.includes(source as typeof CLIENT_EXTERNALS[number])) return null
        throw new Error(
          `client bundle purity: ${JSON.stringify(source)} is not a Harness platform module; use a type-only import or a Cordis service`,
        )
      },
    }, {
      name: 'dsh-observer-css-modules',
      resolveId(source: string, importer: string | undefined) {
        if (!source.endsWith('.module.css')) return null
        const base = importer === undefined ? process.cwd() : dirname(importer)
        return `${CSS_PREFIX}${relative(process.cwd(), resolve(base, source))}${CSS_SUFFIX}`
      },
      async load(id: string) {
        if (!id.startsWith(CSS_PREFIX)) return null
        const relativeFile = id.slice(CSS_PREFIX.length, -CSS_SUFFIX.length)
        const file = resolve(process.cwd(), relativeFile)
        this.addWatchFile(file)
        const source = await readFile(file)
        const result = transform({
          filename: file,
          code: source,
          cssModules: { pattern: '[hash]_[local]' },
          minify: true,
        })
        const classes = Object.fromEntries(
          Object.entries(result.exports ?? {}).map(([local, value]) => [local, value.name]),
        )
        const tagId = `${PACKAGE_ID}/${relativeFile}`
        return [
          `const css = ${JSON.stringify(result.code.toString())};`,
          `const tagId = ${JSON.stringify(tagId)};`,
          'if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {',
          '  const tag = document.createElement("style");',
          `  tag.dataset.plugin = ${JSON.stringify(PACKAGE_ID)};`,
          '  tag.dataset.pluginCss = tagId;',
          '  tag.textContent = css;',
          '  document.head.appendChild(tag);',
          '}',
          `export default ${JSON.stringify(classes)};`,
        ].join('\n')
      },
    }],
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_ID)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
