#!/usr/bin/env node
// Check of every Storybook story, in the light and dark themes: it must render, its play function
// (interactions) must pass, and axe-core must find no accessibility violation, with the same
// engine and rules as the Accessibility tab of Storybook (addon a11y). Run from the command line
// and in CI, where Storybook itself cannot block anything.
//
// Usage: pnpm --filter front build-storybook && pnpm --filter front test:stories
//
// It honours the a11y parameters of each story, like the addon:
//   parameters.a11y.test: 'error' (default from .storybook/preview.ts) fails the check,
//                         'todo' only reports, 'off' skips the story;
//   parameters.a11y.config / options: given to axe.configure / axe.run.

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { extname, join, normalize, resolve } from 'node:path'
import { chromium } from '@playwright/test'

const require = createRequire(import.meta.url)
const STATIC_DIR = resolve(process.argv[2] ?? 'storybook-static')
const THEMES = ['light', 'dark']
const PARALLEL = 4
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
}

/** Minimal static server for the built Storybook, on a free port. */
function serve(dir) {
  const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname))
    const file = join(dir, path.endsWith('/') ? `${path}index.html` : path)
    if (!file.startsWith(dir)) return res.writeHead(403).end()
    try {
      const body = await readFile(file)
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' })
      res.end(body)
    } catch {
      res.writeHead(404).end()
    }
  })
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done(server)))
}

/**
 * Runs before the preview: records the events of the Storybook channel as soon as it exists. The
 * render phase stays "finished" even when a play function throws, only these events tell.
 */
function recordStoryEvents() {
  window.__storyCheck = { finished: false, errors: [] }
  let channel
  Object.defineProperty(window, '__STORYBOOK_ADDONS_CHANNEL__', {
    configurable: true,
    get: () => channel,
    set(value) {
      channel = value
      value.on('storyFinished', () => (window.__storyCheck.finished = true))
      for (const name of ['playFunctionThrewException', 'storyThrewException', 'storyErrored']) {
        value.on(name, (error) =>
          window.__storyCheck.errors.push(`${name}: ${error?.message ?? error?.title ?? ''}`),
        )
      }
    },
  })
}

async function checkStory(browser, base, axeSource, story, theme) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  try {
    await page.addInitScript(recordStoryEvents)
    await page.goto(`${base}/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`)
    // Wait for the story to be rendered and its play function, if any, to be done.
    await page.waitForFunction(() => window.__storyCheck.finished, null, { timeout: 15000 })
    // A story that fails to render, or whose play function fails, is a failure too: nothing
    // else runs the play functions in CI.
    const storyErrors = await page.evaluate(() => window.__storyCheck.errors)
    if (storyErrors.length > 0) throw new Error(storyErrors.join(' | ').split('\n')[0])

    // Let the entry animations (fade-in, zoom-in) finish: axe reads the final colors.
    await page.waitForTimeout(800)
    await page.addScriptTag({ content: axeSource })
    return await page.evaluate(async () => {
      const a11y = window.__STORYBOOK_PREVIEW__.currentRender.story.parameters.a11y ?? {}
      if (a11y.test === 'off') return { level: 'off', violations: [] }
      // Like the addon: a story is a fragment of a page, so the "region" rule (content inside
      // landmarks) only makes sense on a whole page and is off unless a story turns it on.
      window.axe.configure({ rules: [{ id: 'region', enabled: false }] })
      if (a11y.config) window.axe.configure(a11y.config)
      // The whole body: dialogs and toasts are rendered outside the story root.
      const result = await window.axe.run(document.body, {
        ...a11y.options,
        resultTypes: ['violations'],
      })
      return {
        level: a11y.test ?? 'error',
        violations: result.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          help: violation.help,
          targets: violation.nodes.map((node) => node.target.join(' ')),
        })),
      }
    })
  } finally {
    await page.close()
  }
}

const server = await serve(STATIC_DIR)
const base = `http://127.0.0.1:${server.address().port}`
const axeSource = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8')
const index = await (await fetch(`${base}/index.json`)).json()
const stories = Object.values(index.entries).filter((entry) => entry.type === 'story')
const browser = await chromium.launch()

const jobs = THEMES.flatMap((theme) => stories.map((story) => ({ story, theme })))
let failures = 0
let reported = 0
const errors = []

async function worker() {
  for (let job = jobs.shift(); job; job = jobs.shift()) {
    const label = `[${job.theme}] ${job.story.title} › ${job.story.name}`
    try {
      const { level, violations } = await checkStory(browser, base, axeSource, job.story, job.theme)
      if (violations.length === 0) continue
      if (level === 'error') failures++
      else reported++
      console.log(`${level === 'error' ? '✗' : '!'} ${label}`)
      for (const violation of violations) {
        console.log(`    ${violation.id} (${violation.impact}): ${violation.help}`)
        for (const target of violation.targets.slice(0, 5)) console.log(`      ${target}`)
      }
    } catch (error) {
      errors.push(`${label}: ${error.message.split('\n')[0]}`)
    }
  }
}

await Promise.all(Array.from({ length: PARALLEL }, worker))
await browser.close()
server.close()

for (const error of errors) console.log(`✗ ${error}`)
console.log(
  `\n${stories.length} stories × ${THEMES.length} thèmes : ${failures} avec violations, ` +
    `${reported} signalées (todo), ${errors.length} en erreur (rendu, play ou délai).`,
)
process.exit(failures > 0 || errors.length > 0 ? 1 : 0)
