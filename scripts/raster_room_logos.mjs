// Render every SVG in logo-src/room once to a transparent PNG in
// logo-src/room/raster/, 260px high (1800px wide at most),
// so scripts/build_room_logos.py can bake SVG and PNG logos the same way.
// Chromium draws the SVG exactly as a browser would, which is the point.
//
// Needs playwright-core and a Chromium; neither is a dependency of the site.
//   npm i --no-save playwright-core
//   CHROMIUM=/path/to/chromium node scripts/raster_room_logos.mjs
// Then run python3 scripts/build_room_logos.py.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright-core'

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'logo-src', 'room')
const OUT = path.join(SRC, 'raster')
const H = 260
const MAX_W = 1800
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ deviceScaleFactor: 1 })
for (const file of fs.readdirSync(SRC).filter((f) => f.endsWith('.svg')).sort()) {
  const b64 = Buffer.from(fs.readFileSync(path.join(SRC, file))).toString('base64')
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent"><img id="i" src="data:image/svg+xml;base64,${b64}"></body></html>`)
  await page.waitForFunction(() => { const i = document.getElementById('i'); return i.complete && i.naturalWidth > 0 }, null, { timeout: 10000 }).catch(() => {})
  const [w, h] = await page.evaluate(() => { const i = document.getElementById('i'); return [i.naturalWidth, i.naturalHeight] })
  if (!w || !h) { console.log('FAILED', file); continue }
  let W = Math.round((w * H) / h)
  let HH = H
  if (W > MAX_W) { W = MAX_W; HH = Math.round((h * MAX_W) / w) }
  await page.setViewportSize({ width: W + 20, height: HH + 20 })
  await page.evaluate(([W, HH]) => { const i = document.getElementById('i'); Object.assign(i.style, { width: `${W}px`, height: `${HH}px`, display: 'block', margin: '10px' }) }, [W, HH])
  await (await page.$('#i')).screenshot({ path: path.join(OUT, file.replace(/\.svg$/, '.png')), omitBackground: true })
  console.log('ok', file, W, HH)
}
await browser.close()
