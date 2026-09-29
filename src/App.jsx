import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react'
import {
  Mail, Calculator, Download, X, TrendingUp, CalendarDays, MapPin,
  CircleCheck, ChevronDown, ShieldCheck, Ticket, Layers, Users,
  LineChart, Landmark, Scale, Cpu, Newspaper, Banknote, Trophy, Sparkles,
  Info, ArrowRight, ArrowUp, Crown, Martini, Mic, Presentation, MonitorPlay,
  Handshake, Store, DoorClosed, Coffee, Video, Flag, Projector, ChevronRight,
  Award, ListChecks, Eye, ScanLine, Wifi, QrCode, Radio, Shirt, Droplets, IdCard, Contact,
  ArrowDown, Target, Building2
} from 'lucide-react'
import { PresentMode, usePresent, CopyLinkButton } from './PresentMode.jsx'
import { wallStreetSVG, FIDI_VIEWBOX, probabilityLine } from './skyline.js'
import { REGISTERED_LOGOS, PARTNER_LOGOS, PRESS_LOGOS } from './roomLogos.js'

const base = import.meta.env.BASE_URL

// The brand is always written NEXTPredict. This brochure had no helper for it:
// the rule was to keep the name out of uppercase elements. <Brand> resets the
// case, so it is safe inside one, and carries the two-tone wordmark.
function Brand() {
  return <span className="normal-case">NEXT<span className="text-brand-yellow">Predict</span></span>
}

// The venue line, as every printed and on-page date line says it. Change it the
// moment Event Ops confirms dates and venue.
const VENUE_LINE = 'October 2027 · New York City · exact dates and venue to be announced'

const fmtPrice = (n) => `€${n.toLocaleString('en-US')}`
const fmtUsd = (n) => `$${n.toLocaleString('en-US')}`

// ─── Partner Recognition Levels ────────────────────────────────────────────
// Recognition is earned on TOTAL spend across all NEXTPredict 2027 products.
// Headline sits above Diamond but is gated on the Headline Partner product,
// not on spend: accumulating spend alone never reaches it.
const TIERS = [
  { name: 'Silver',   min: 0,      color: 'text-brand-gray' },
  { name: 'Gold',     min: 30000,  color: 'text-yellow-400' },
  { name: 'Platinum', min: 80000,  color: 'text-blue-300' },
  { name: 'Diamond',  min: 135000, color: 'text-cyan-100' },
]
const HEADLINE_TIER = { name: 'Headline', min: null, color: 'text-brand-yellow' }
const HEADLINE_PRODUCT_IDS = [1] // "Headline Partner"

const hasHeadline = (cart) => Array.isArray(cart) && cart.some((i) => HEADLINE_PRODUCT_IDS.includes(i.id))
const spendTierIdx = (total) => TIERS.reduce((best, t, i) => (total >= t.min ? i : best), 0)
const resolveTier = (total, cart) => (hasHeadline(cart) ? HEADLINE_TIER : TIERS[spendTierIdx(total)])
const nextSpendTier = (total, cart) => (hasHeadline(cart) ? null : TIERS[spendTierIdx(total) + 1] || null)

// ─── Shareable plan link ────────────────────────────────────────────────────
// ?plan=<id>,<id>,... - product ids from the pricing array, one per unit, so a
// product taken twice appears twice (Lanyard Sponsor x2 = 53,53). The query is
// written by hand so the commas stay commas (URLSearchParams writes %2C). On
// load App feeds each id through the page's own add handler, so caps,
// conflicts and sold or reserved states still apply; unknown or refused
// entries are skipped, then the parameter leaves the address bar. The 2026
// rebooking rate is not carried: whether it applies is the buyer's to confirm.
const planTotal = (cart, rebooking) => cart.reduce((s, i) => s + (i.poa ? 0 : (rebooking ? Math.round(i.price * 0.85) : i.price)), 0)
function planLink(cart) {
  const url = new URL(window.location.href)
  url.searchParams.delete('present')
  url.searchParams.delete('plan')
  url.hash = ''
  const rest = url.searchParams.toString()
  url.search = `${rest ? `${rest}&` : ''}plan=${cart.map((i) => i.id).join(',')}`
  return url.href
}
function takePlanParam() {
  try {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('plan')) return null
    const raw = url.searchParams.get('plan') || ''
    url.searchParams.delete('plan')
    window.history.replaceState(window.history.state, '', url)
    return raw
  } catch { return null }
}

// ─── Contact Sales mailto builder ──────────────────────────────────────────
function buildMailto(cart, rebooking) {
  if (!cart.length) return `mailto:sales@next.io?subject=${encodeURIComponent('NEXTPredict 2027 - Partnership Enquiry')}`
  const total = cart.reduce((s, i) => s + (i.poa ? 0 : (rebooking ? Math.round(i.price * 0.85) : i.price)), 0)
  const tier = resolveTier(total, cart)
  const lines = [
    'Hi,',
    '',
    "I'd like to enquire about the following partnership packages for NEXTPredict 2027:",
    '',
    ...cart.map((i) => {
      if (i.poa) return `  - ${i.title}: POA`
      const p = rebooking ? Math.round(i.price * 0.85) : i.price
      return `  - ${i.title}: EUR ${p.toLocaleString('en-US')}`
    }),
    '',
    `Total Investment: EUR ${total.toLocaleString('en-US')}${rebooking ? ' (15% rebooking rate applied)' : ''}`,
    `Partner Recognition Level: ${tier.name} Partner`,
    '',
    'Please let me know the next steps.',
    '',
    'Kind regards,',
  ]
  const subject = encodeURIComponent('NEXTPredict 2027 - Partnership Enquiry')
  const body = encodeURIComponent(lines.join('\r\n'))
  return `mailto:sales@next.io?subject=${subject}&body=${body}`
}

// ─── Printed outputs ────────────────────────────────────────────────────────
// Both print windows mirror the page: deliverables as a list, then the 📅 / ⚠️
// lines in a quiet "Availability & terms" block with small icons - never red or
// yellow boxes - the lede set plain, and the brand written NEXTPredict (no
// text-transform on anything that carries it). Inter is requested and print
// waits for it, falling back to the system face offline.
const PRINT_HEAD = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">`
const printOnLoad = (delay) => `<script>window.addEventListener('load',function(){var go=function(){setTimeout(function(){window.print()},${delay})};(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(go,go)});<\/script>`
const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const ICON_CAL = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#a37d00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>'
const ICON_INFO = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#8a8a8a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
const PRINT_TERMS_CSS = `.incl{padding-left:18px;margin:0}.incl li{margin-bottom:2px}
    .terms{margin-top:10px;padding-top:8px;border-top:1px solid #ececec}
    .tlabel{font-size:9px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#8a8a8a;margin-bottom:5px}
    .terms ul{list-style:none;padding:0;margin:0}
    .terms li{display:flex;gap:7px;align-items:flex-start;font-size:11px;color:#555;line-height:1.5;margin-bottom:3px}
    .terms svg{flex:none;margin-top:3px}
    .glance{margin:8px 0 6px}
    .glance ul{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:2px 16px;font-size:11.5px;color:#555;line-height:1.5}
    .glance b{color:#1a1a1a;font-weight:800}`
function printDeliverables(bullets) {
  const { items, terms } = splitBullets(bullets)
  const lis = items.map((l) => `<li>${escHtml(l)}</li>`).join('')
  const tls = terms.map((t) => `<li>${t.kind === 'avail' ? ICON_CAL : ICON_INFO}<span>${escHtml(t.text)}</span></li>`).join('')
  return `${lis ? `<ul class="incl">${lis}</ul>` : ''}${tls ? `<div class="terms"><p class="tlabel">Availability &amp; terms</p><ul>${tls}</ul></div>` : ''}`
}
// The card's at-a-glance row, printed on one line under the product.
function printGlance(item) {
  const r = reachFor(item)
  const ld = leadDataLine(item)
  const lead = ld ? `<p class="tlabel" style="margin-top:4px">Lead data: ${escHtml(ld)}</p>` : ''
  if (!r) return lead
  return `<div class="glance"><p class="tlabel">${r.estimate ? 'Estimated reach' : 'At a glance'}</p><ul>${r.figs.map((f) => `<li><b>${escHtml([f.pre, f.value].filter(Boolean).join(' '))}</b> ${escHtml(f.label)}</li>`).join('')}</ul>${r.note ? `<p class="tlabel" style="text-transform:none;letter-spacing:0;font-weight:400">${escHtml(r.note)}</p>` : ''}${lead}</div>`
}
const openPrintWindow = (html) => {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 120000)
}

// ─── PDF proposal generator ─────────────────────────────────────────────────
// The 2026 room as printed: the proof band's four figures, then its label, the
// accredited press and the source (no text-transform on the line that names
// NEXTPredict).
const roomHtml = () => `<div class="proof">${ROOM_FIGURES.map(([n, l]) => `<div><b style="color:#1a1a1a">${escHtml(n)}</b><span>${escHtml(l)}</span></div>`).join('')}</div>
    <p class="psrc">${escHtml(ROOM_LABEL)}. Accredited press: ${escHtml(ROOM_PRESS.join(', '))}. ${escHtml(ROOM_BLOC[0])} ${escHtml(lc1(ROOM_BLOC[1]))}.</p>
    <p class="psrc">${escHtml(ROOM_SOURCE)}</p>`
// The NPS proof as printed: the same three tiles, the same source line.
const proofHtml = () => `<div class="proof">${NPS_PROOF.map(([n, l, ours]) => `<div><b style="color:${ours ? '#1a1a1a' : '#888'}">${escHtml(n)}</b><span>${escHtml(l)}</span></div>`).join('')}</div>`

function downloadProposalPDF(cart, rebooking) {
  const total = cart.reduce((s, i) => s + (i.poa ? 0 : (rebooking ? Math.round(i.price * 0.85) : i.price)), 0)
  const tier = resolveTier(total, cart)
  const nextTier = nextSpendTier(total, cart)
  const tierColors = { Silver: '#9ca3af', Gold: '#f59e0b', Platinum: '#93c5fd', Diamond: '#cffafe', Headline: '#ffcf33' }
  const tierColor = tierColors[tier.name] || '#ffcf33'
  const rows = cart.map((item) => {
    const p = rebooking ? Math.round(item.price * 0.85) : item.price
    return `<tr>
      <td style="padding:12px 16px;border-bottom:1px solid #e5e5e5;vertical-align:top">
        <div style="font-weight:700">${escHtml(item.title)}</div>
        <div style="font-size:12px;color:#888;margin-top:2px">${escHtml(item.cat)}</div>
        ${printGlance(item)}
        <div class="deliv">${printDeliverables(item.bullets)}</div>
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #e5e5e5;text-align:right;font-weight:700;vertical-align:top;white-space:nowrap">${item.poa ? 'POA' : '&#8364;' + p.toLocaleString('en-US')}</td>
    </tr>`
  }).join('')
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>NEXTPredict 2027 - Partnership Proposal</title>
  ${PRINT_HEAD}
  ${printOnLoad(500)}
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;background:#fff}
    .header{background:#242426;color:#fff;padding:48px 48px 40px}
    .logo{font-size:26px;font-weight:900;letter-spacing:-0.5px;margin-bottom:6px}
    .logo span{color:#ffcf33}
    .sub{color:#888888;font-size:13px;margin-top:4px}
    .body{padding:40px 48px}
    .label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#999;margin-bottom:14px}
    .discount{background:#fffbea;border:1px solid #ffcf33;border-radius:6px;padding:10px 16px;font-size:13px;color:#996c00;margin-bottom:24px}
    .tier-box{border-radius:8px;padding:20px 24px;margin-bottom:32px;display:flex;align-items:center;justify-content:space-between;border:2px solid ${tierColor}}
    .tier-name{font-size:22px;font-weight:900;text-transform:uppercase;color:${tierColor}}
    .tier-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#999;margin-bottom:4px}
    .tier-next{font-size:13px;color:#666}
    table{width:100%;border-collapse:collapse;margin-bottom:0}
    thead tr{background:#f5f5f5}
    th{padding:10px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999}
    th:last-child{text-align:right}
    .deliv{margin-top:8px;font-size:12px;color:#555;line-height:1.6}
    ${PRINT_TERMS_CSS}
    .total td{background:#242426;color:#fff;padding:16px;font-weight:900;font-size:15px}
    .total td:last-child{text-align:right;color:#ffcf33;font-size:20px}
    .footer{padding:32px 48px;border-top:3px solid #ffcf33;margin-top:40px}
    .footer p{font-size:13px;color:#666;line-height:1.7}
    .proof{display:flex;gap:12px;margin-bottom:8px}
    .proof div{flex:1;border:1px solid #e5e5e5;border-radius:8px;padding:12px 14px}
    .proof b{display:block;font-size:22px;font-weight:900;line-height:1}
    .proof span{display:block;margin-top:6px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:#666;line-height:1.35}
    .psrc{font-size:10.5px;color:#888;line-height:1.5}
    .footer strong{color:#1a1a1a}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}tr{page-break-inside:avoid}}
  </style></head><body>
  <div class="header">
    <div class="logo">NEXT<span>Predict</span> 2027</div>
    <div class="sub">Partnership Proposal &nbsp;&middot;&nbsp; Generated ${date}</div>
  </div>
  <div class="body">
    ${rebooking ? '<div class="discount">&#10003; 15% rebooking rate applied to all packages below (2026 partners only).</div>' : ''}
    <div class="label">Who is in the room</div>
    ${roomHtml()}
    <div class="label" style="margin-top:22px">Partner NPS, NEXT Summits 2026</div>
    ${proofHtml()}
    <p class="psrc" style="margin-bottom:28px">${escHtml(NPS_SOURCE)}</p>
    <div class="label">Partner Recognition Level</div>
    <div class="tier-box">
      <div>
        <div class="tier-label">Your Level</div>
        <div class="tier-name">${tier.name} Partner</div>
        ${nextTier
          ? `<div class="tier-next">&#8364;${(nextTier.min - total).toLocaleString('en-US')} away from ${nextTier.name} Partner</div>`
          : `<div class="tier-next" style="color:${tierColor};font-weight:700">&#10022; ${tier.name} Partner level reached</div>`}
      </div>
      <div style="text-align:right">
        <div class="tier-label">Total Eligible Spend</div>
        <div style="font-size:28px;font-weight:900;color:${tierColor}">&#8364;${total.toLocaleString('en-US')}</div>
      </div>
    </div>
    <p style="font-size:11px;color:#777;margin:-20px 0 32px 0;line-height:1.5">
      Your Partner Recognition Level is determined by the combined total of the ${cart.length} product${cart.length === 1 ? '' : 's'} listed below. It carries no additional charge and adds no further products or activations. Eligible spend covers NEXTPredict 2027 only.
    </p>
    ${planLeadLine(total) ? `<div class="label">Lead data</div><p style="font-size:14px;font-weight:700;margin-bottom:4px">${escHtml(planLeadLine(total))}.</p><p style="font-size:11px;color:#777;margin-bottom:32px;line-height:1.5">${escHtml(leadDataRule())}</p>` : ''}
    <div class="label">Selected Packages</div>
    <table>
      <thead><tr><th>Package &amp; Deliverables</th><th style="text-align:right">Investment</th></tr></thead>
      <tbody>${rows}
        <tr class="total">
          <td>Total Investment</td>
          <td>&#8364;${total.toLocaleString('en-US')}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="footer">
    <p><strong>Ready to secure your position?</strong><br>
    Contact our partnerships team: <strong>sales@next.io</strong><br>
    All prices exclude VAT. Availability subject to change without notice.<br>
    NEXTPredict 2027 &nbsp;&middot;&nbsp; October 2027 &nbsp;&middot;&nbsp; New York City &nbsp;&middot;&nbsp; Exact dates and venue to be announced</p>
  </div>
  </body></html>`
  openPrintWindow(html)
}

// ─── Full rate card PDF ─────────────────────────────────────────────────────
// Printed card by card, in page order. A card with two routes prints its route
// tiles, then each route's lede, deliverables and terms under its own heading.
function downloadRateCardPDF() {
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const price = (p) => (p.poa ? 'POA' : '&#8364;' + p.price.toLocaleString('en-US'))
  const avail = (p) => (p.status === 'sold' ? 'SOLD' : p.status === 'reserved' ? 'RESERVED'
    : p.exclusive ? 'Exclusive' : p.avail ? `${p.avail} available` : '')
  const lede = (p) => `<p class="lede">${escHtml(stripQuotes(p.quote))}</p>`
  const body = CARDS.map(({ cat, cards }) => {
    const rows = cards.map((card) => {
      if (card.options.length === 1) {
        const p = card.options[0]
        const a = avail(p)
        return `<div class="product">
        <div class="phead"><div><h3>${escHtml(p.title)}</h3>${a ? `<span class="avail">${a}</span>` : ''}</div>
        <div class="price">${price(p)}</div></div>
        ${lede(p)}
        ${printGlance(p)}
        ${printDeliverables(p.bullets)}
      </div>`
      }
      // as on the page: a tile names its route and price, plus its count or status
      const tileSub = (p) => (isOut(p) ? avail(p) : !p.exclusive && p.avail ? avail(p) : '')
      const tiles = card.options.map((p) => `<div class="tile"><span class="tl">${escHtml(routeLabel(card, p))}</span><span class="tp">${price(p)}</span>${tileSub(p) ? `<span class="ta">${tileSub(p)}</span>` : ''}</div>`).join('')
      // a value row every route shares prints once, under the tiles, as on the slide
      const glances = card.options.map((p) => printGlance(p))
      const sharedGlance = glances.every((g) => g === glances[0])
      const routes = card.options.map((p, k) => `<div class="route">
          <div class="rhead"><h4>${escHtml(routeLabel(card, p))}</h4><span class="rprice">${price(p)}</span></div>
          ${lede(p)}
          ${sharedGlance ? '' : glances[k]}
          ${printDeliverables(p.bullets)}
        </div>`).join('')
      return `<div class="product multi">
        <div class="phead"><div><h3>${escHtml(card.title)}</h3></div></div>
        <div class="tiles">${tiles}</div>
        ${sharedGlance ? glances[0] : ''}
        ${routes}
      </div>`
    }).join('')
    return `<section><h2>${escHtml(cat)}</h2>${rows}</section>`
  }).join('')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>NEXTPredict 2027 - Partnership Rate Card</title>
  ${PRINT_HEAD}
  ${printOnLoad(600)}
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;background:#fff;font-size:12px;line-height:1.5}
    .cover{background:#242426;color:#fff;padding:56px 48px}
    .cover h1{font-size:30px;font-weight:900;letter-spacing:-0.5px}
    .cover h1 span{color:#ffcf33}
    .cover p{color:#888888;margin-top:8px;font-size:13px}
    section{padding:28px 48px 8px;page-break-before:auto}
    h2{font-size:18px;font-weight:900;text-transform:uppercase;border-bottom:3px solid #ffcf33;padding-bottom:6px;margin-bottom:16px;page-break-after:avoid}
    .product{border:1px solid #e5e5e5;border-radius:8px;padding:14px 16px;margin-bottom:14px;page-break-inside:avoid}
    .product.multi{page-break-inside:auto}
    .phead{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
    .phead h3{font-size:14px;font-weight:800;display:inline}
    .avail{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b6b6b;border:1px solid #dcdcdc;border-radius:4px;padding:1px 7px;margin-left:8px;white-space:nowrap}
    .price{font-size:16px;font-weight:900;white-space:nowrap}
    .lede{color:#444;margin:6px 0 8px;padding-left:9px;border-left:2px solid #ffcf33}
    .tiles{display:flex;gap:8px;margin:10px 0 4px}
    .tile{flex:1;border:1px solid #e0e0e0;border-radius:6px;padding:7px 10px;display:flex;flex-direction:column;gap:2px}
    .tile .tl{font-size:9.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#555}
    .tile .tp{font-size:14px;font-weight:900}
    .tile .ta{font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;color:#888}
    .route{margin-top:12px;padding-top:10px;border-top:1px dashed #e0e0e0;page-break-inside:avoid}
    .rhead{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
    .rhead h4{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#444}
    .rprice{font-size:14px;font-weight:900;white-space:nowrap}
    ${PRINT_TERMS_CSS}
    .proof{display:flex;gap:12px;margin-bottom:8px}
    .proof div{flex:1;border:1px solid #e5e5e5;border-radius:8px;padding:12px 14px}
    .proof b{display:block;font-size:22px;font-weight:900;line-height:1}
    .proof span{display:block;margin-top:6px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:#666;line-height:1.35}
    .psrc{font-size:10.5px;color:#888;line-height:1.5}
    .foot{padding:24px 48px 40px;border-top:3px solid #ffcf33;margin-top:24px;color:#666;font-size:11px;line-height:1.7}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body>
  <div class="cover">
    <h1>NEXT<span>Predict</span> 2027</h1>
    <p>Full Partnership Rate Card &nbsp;&middot;&nbsp; October 2027 &nbsp;&middot;&nbsp; New York City &nbsp;&middot;&nbsp; Exact dates and venue to be announced &nbsp;&middot;&nbsp; Generated ${date}</p>
  </div>
  <section><h2>Who is in the room</h2>${roomHtml()}</section>
  <section><h2>Partner NPS, NEXT Summits 2026</h2>${proofHtml()}<p class="psrc">${escHtml(NPS_SOURCE)}</p></section>
  ${leadDataRule() ? `<section><h2>Lead data</h2><p style="font-size:12.5px;color:#333">${escHtml(leadDataRule())}</p></section>` : ''}
  ${body}
  <div class="foot">All prices exclude VAT. Availability subject to change without notice. Prices are all-in where stated.<br>
  Exclusive and shared routes over the same physical inventory are alternatives, never sold together.<br>
  Contact: <strong>sales@next.io</strong> &nbsp;&middot;&nbsp; next.io</div>
  </body></html>`
  openPrintWindow(html)
}

// ─── Scroll animation hook ──────────────────────────────────────────────────
// Reveals [data-anim] blocks as they scroll in. `key` re-runs it when blocks
// mount later (a filter bringing a family back): with a mount-only effect those
// blocks were created at opacity 0 and never observed, so they stayed invisible.
const anim = { opacity: 0, transform: 'translateY(20px)', transition: 'opacity .6s ease, transform .6s ease' }
function useScrollAnimation(key) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.style.opacity = '1'
          e.target.style.transform = 'none'
          e.target.dataset.shown = '1'
          observer.unobserve(e.target)
        }
      }),
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    )
    document.querySelectorAll('[data-anim]:not([data-shown])').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [key])
}

// Marks the pictures on screen (`data-inview`), so the cards' slow Ken Burns
// runs only where it can be seen. The attribute is not a prop, so a re-render
// never drops it (the HR Connect lesson: never mark state with a class that
// React rewrites).
function useInView(selector, key) {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) e.target.setAttribute('data-inview', '')
      else e.target.removeAttribute('data-inview')
    }), { rootMargin: '60px 0px' })
    document.querySelectorAll(selector).forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [selector, key])
}

// ─── Pricing data ───────────────────────────────────────────────────────────
// 2027 rate card. Prices in EUR, exclude VAT. Exclusive/shared versions of the
// same physical inventory are either/or routes and conflict in the calculator.
const pricing = [

  // Category Ownership
  { id: 1, cat: 'Category Ownership', title: 'Headline Partner', price: 300000, exclusive: true, avail: null, featured: true,
    quote: '"One brand over the entire event. Headline Partnership is category ownership of the prediction markets summit: your name in the event lock-up, first position everywhere the event appears."',
    bullets: 'Headline Partner status - the highest position in the partner hierarchy\n"Brought to you by [your brand]" event lock-up across venue and digital touchpoints\nPress release announcing your Headline Partnership, including a quote from your C-level executive\nPre-event executive interview, produced and distributed by NEXT.io media\nMost prominent venue branding across the event, plus top billing on website and digital channels\n30-second advertisement video played in conference breaks\nVisibility across event emails, social promotion, official photography and the aftermovie (excluding peripheral events)\n20-minute presentation by your C-level speaker\nFull brand ownership of the content, within event guidelines\nSlide support and AV production\n"Powered by" brand integration in the session title\nYour logo on screen during the session\nProfessional video footage of your presentation, produced by NEXT.io\n10 Full Event passes + 2 VIP passes + 1 Speaker pass\n⚠️ One available - category ownership is sold once.\n⚠️ You shape the title, topic and format in collaboration with the NEXT.io production and conference content team, who approve the presentation for quality.\n⚠️ The headline logo does not appear on the \'I am speaking\', \'I am attending\' or welcome banners on social media.',
    impact: ['Category Leadership', 'Brand Awareness', 'Thought Leadership'], type: ['Branding & Visibility', 'Speaking & Content'] },

  // NEXTworking Evening Events
  { id: 2, cat: 'NEXTworking Evening Events', title: 'Day 1 NEXTworking, Exclusive Partner', price: 150000, exclusive: true, avail: null, featured: true,
    quote: '"Own the biggest networking night of the event. The Day 1 NEXTworking evening is where the whole market - platforms, exchanges, operators and market makers - is in one room, under your brand alone."',
    bullets: 'Exclusive partner branding across the Day 1 NEXTworking evening event\nEvent video branding and brand-watermarked official photography\nOpportunity for a branded merchandise moment, optional and supplied by you\nSummit-wide general branding plus promotion and email visibility\nLogo at the end of the official aftermovie\nOnsite filmed interview with the NEXT.io media team\nLogo on the partners section of the website\n4 Full Event passes\n⚠️ Either/or route: if the exclusive partnership sells, the shared Day 1 route is withdrawn.\n⚠️ Partner-designed branding follows the NEXT.io brand guidelines.',
    impact: ['Brand Awareness', 'Deal Flow'], type: ['Networking & Hospitality'] },
  { id: 3, cat: 'NEXTworking Evening Events', title: 'Day 2 NEXTworking, Exclusive Partner', price: 125000, exclusive: true, avail: null,
    quote: '"Close the event with your name on the night. Exclusive ownership of the Day 2 NEXTworking evening - the wrap-party conversations where the follow-ups get agreed."',
    bullets: 'Exclusive partner branding across the Day 2 NEXTworking evening event\nEvent video branding and brand-watermarked official photography\nOpportunity for a branded merchandise moment, optional and supplied by you\nSummit-wide general branding plus promotion and email visibility\nLogo at the end of the official aftermovie\nOnsite filmed interview with the NEXT.io media team\nLogo on the partners section of the website\n4 Full Event passes\n⚠️ Either/or route: if the exclusive partnership sells, the shared Day 2 route is withdrawn.\n⚠️ Partner-designed branding follows the NEXT.io brand guidelines.',
    impact: ['Brand Awareness', 'Deal Flow'], type: ['Networking & Hospitality'] },
  { id: 4, cat: 'NEXTworking Evening Events', title: 'Pre-Registration Event, Exclusive Partner', price: 125000, exclusive: true, avail: null,
    quote: '"Meet the market before the doors open. The pre-registration evening is the first-mover networking moment of event week, and one brand owns it."',
    bullets: 'Exclusive partner branding across the pre-registration evening event\nEvent video branding and brand-watermarked official photography\nOpportunity for a branded merchandise moment, optional and supplied by you\nGeneral summit branding across the event\nLogo at the end of the official aftermovie\nOnsite filmed interview with the NEXT.io media team\nLogo on the partners section of the website\nIndividual pre-event welcome post on social media, designed and posted by NEXT.io\n4 Full Event passes\n⚠️ Either/or route: if the exclusive partnership sells, the shared pre-registration route is withdrawn.\n⚠️ Partner-designed branding follows the NEXT.io brand guidelines.',
    impact: ['Brand Awareness', 'Deal Flow'], type: ['Networking & Hospitality'] },
  { id: 5, cat: 'NEXTworking Evening Events', title: 'Day 1 NEXTworking, Non-Exclusive Partner', price: 38000, exclusive: false, avail: 5,
    quote: '"A shared route into the Day 1 evening: co-branding across the biggest networking night without the exclusive commitment."',
    bullets: 'Shared partner branding at the Day 1 NEXTworking evening event\nEvent video branding and brand-watermarked official photography\nOpportunity for a branded merchandise moment, optional and supplied by you\nGeneral summit branding\nLogo on the partners section of the website\nShared pre-event welcome post on social media, designed and posted by NEXT.io\n2 Full Event passes\n⚠️ Shared route - released only while the Day 1 exclusive partnership remains unsold.',
    impact: ['Brand Awareness'], type: ['Networking & Hospitality'] },
  { id: 6, cat: 'NEXTworking Evening Events', title: 'Day 2 NEXTworking, Non-Exclusive Partner', price: 30000, exclusive: false, avail: 5,
    quote: '"Co-branding across the Day 2 closing evening - a shared presence at the night the market says its goodbyes and books its follow-ups."',
    bullets: 'Shared partner branding at the Day 2 NEXTworking evening event\nEvent video branding and brand-watermarked official photography\nOpportunity for a branded merchandise moment, optional and supplied by you\nGeneral summit branding\nLogo on the partners section of the website\nShared pre-event welcome post on social media, designed and posted by NEXT.io\n2 Full Event passes\n⚠️ Shared route - released only while the Day 2 exclusive partnership remains unsold.',
    impact: ['Brand Awareness'], type: ['Networking & Hospitality'] },
  { id: 7, cat: 'NEXTworking Evening Events', title: 'Pre-Registration Event, Non-Exclusive Partner', price: 34000, exclusive: false, avail: 5,
    quote: '"A shared presence at the first networking moment of event week, as delegates collect badges and the market warms up."',
    bullets: 'Shared partner branding at the pre-registration evening event\nEvent video branding and brand-watermarked official photography\nOpportunity for a branded merchandise moment, optional and supplied by you\nGeneral summit branding\nLogo on the partners section of the website\nShared pre-event welcome post on social media, designed and posted by NEXT.io\n2 Full Event passes\n⚠️ Shared route - released only while the pre-registration exclusive partnership remains unsold.',
    impact: ['Brand Awareness'], type: ['Networking & Hospitality'] },
  { id: 8, cat: 'NEXTworking Evening Events', title: 'C-Level Event (Bespoke)', price: 0, poa: true, exclusive: true, avail: null,
    quote: '"An invitation-only senior gathering, built around your target list. Format, guest profile and brand integration are scoped together - and priced to the brief."',
    bullets: 'Bespoke invitation-only senior executive gathering\nCurated decision-maker access built around an agreed guest profile\nFormat, hosting and brand integration scoped with our team\n2 VIP passes\n📅 Priced on application once scope and format are agreed.',
    impact: ['Deal Flow', 'Category Leadership'], type: ['Networking & Hospitality'] },

  // Leadership Stage
  { id: 10, cat: 'Leadership Stage', title: 'Leadership Stage Partner', price: 125000, exclusive: true, avail: null, featured: true,
    quote: '"Put your brand on the main stage of the prediction markets calendar. The Leadership Stage carries the headline content both days - and it sold out in 2026."',
    bullets: 'Leadership Stage area branding across both event days\nStage artwork and branded holding slide\nSummit-wide general branding\nWebsite and social visibility\nLogo at the end of the post-event aftermovie\n2x digital LED side-stage returns next to the stage, designed by partner\n2x branded columns in the Leadership Stage room (A and B), designed by partner\nOnsite filmed interview with the NEXT.io media team\nLogo on the agenda section of the website\n4 Full Event passes\n📅 Sold out in 2026 - one partner only.\n⚠️ The Leadership Stage Presenter slot is sold separately.\n⚠️ The LED returns show static images only, no video.\n⚠️ Partner designs follow the NEXT.io brand guidelines and include the event logo with the headline partner\'s logo.',
    impact: ['Category Leadership', 'Brand Awareness', 'Thought Leadership'], type: ['Speaking & Content', 'Branding & Visibility'] },
  { id: 11, cat: 'Leadership Stage', title: 'Leadership Stage Presenter', price: 95000, exclusive: true, avail: null,
    quote: '"The single biggest speaking slot of the event: one exclusive C-level presentation on the Leadership Stage, Day 2. One slot. One brand."',
    bullets: '20-minute C-level presentation, interview or featured session on the Leadership Stage\nFull brand ownership of the content, within event guidelines\nYou shape the title, topic and format, in collaboration with the NEXT.io production and conference content team\nFull AV and production support\n"Presented by" session title on agenda, website and screens\nLogo on the sponsor wall and in the logo loop on the digital screens, designed by NEXT.io\nOnsite filmed interview with the NEXT.io media team\nIndividual pre-event welcome post on social media, designed and posted by NEXT.io\n3 Full Event passes + 1 Speaker pass\n📅 Exclusive - one slot, Day 2 only.\n⚠️ The NEXT.io conference content team approves the presentation for quality.',
    impact: ['Thought Leadership', 'Category Leadership'], type: ['Speaking & Content'] },
  { id: 13, cat: 'Leadership Stage', title: 'Leadership Stage Custom Session', price: 60000, exclusive: false, avail: 2,
    quote: '"Two of your speakers on the main stage in a session presented by your brand, shaped with the NEXT.io content team, who add two more voices."',
    bullets: '2 speakers nominated by you, plus 2 added by the NEXT.io content team\n20-30 minute session\nYou shape the title, topic and description, in collaboration with the NEXT.io production and conference content team\n"Presented by" session title on agenda, website and screens\nLogo on the sponsor wall and in the logo loop on the digital screens, designed by NEXT.io\nShared pre-event welcome post on social media, designed and posted by NEXT.io\n1 Full Event pass + 2 Speaker passes\n📅 One slot per day, subject to content approval.\n⚠️ The content team adds 2 further speakers; you have no veto over these selections.',
    impact: ['Thought Leadership'], type: ['Speaking & Content'] },
  { id: 14, cat: 'Leadership Stage', title: 'Leadership Stage Chair Partner', price: 45000, exclusive: true, avail: null,
    quote: '"Every seat in the main conference room, both days. Chair branding puts your logo in every audience shot of the headline programme."',
    bullets: 'Branding on all seats in the main conference hall on both event days\nSummit-wide general branding\nWebsite and social visibility\nLogo at the end of the post-event aftermovie\n2 Full Event passes\n⚠️ If artwork is not received by the deadline, only your logo is placed, on a solid colour background.',
    impact: ['Brand Awareness'], type: ['Branding & Visibility'] },
  { id: 15, cat: 'Leadership Stage', title: 'Leadership Stage Branded Session', price: 30000, exclusive: false, avail: 6,
    quote: '"A \'Powered by\' session on the main stage: 25-30 minutes with your C-level speaker in the conversation, in front of the whole event."',
    bullets: '"Powered by" session, 25-30 minutes\n1 C-level speaker nominated by you\nSession branding on agenda, website and screens\nLogo on the sponsor wall and in the logo loop on the digital screens, designed by NEXT.io\nShared pre-event welcome post on social media, designed and posted by NEXT.io\n1 Full Event pass + 1 Speaker pass\n📅 Six slots across the two days, subject to programme.\n⚠️ The content team controls all other speakers, topic, format and placement.',
    impact: ['Thought Leadership'], type: ['Speaking & Content'] },
  { id: 16, cat: 'Leadership Stage', title: 'Leadership Stage Non-Branded Panel', price: 22000, exclusive: false, avail: 4,
    quote: '"A seat on a curated main-stage panel aligned to your expertise - editorial participation with your leadership in the conversation."',
    bullets: 'Curated panel participation aligned to your expertise\n20-30 minute session, with 1 C-level speaker nominated by you\nNo brand attribution on the session - editorial format\nPartner logo on the website\nLogo on the sponsor wall and in the logo loop on the digital screens, designed by NEXT.io\nShared pre-event welcome post on social media, designed and posted by NEXT.io\n1 Speaker pass\n📅 Programme-controlled inventory.\n⚠️ The content team controls the topic, title, all other speakers and the format.',
    impact: ['Thought Leadership'], type: ['Speaking & Content'] },

  // Stage 2 Hub
  { id: 17, cat: 'Stage 2 Hub', title: 'Stage 2 Partner (Both-Days Exclusive)', price: 115000, exclusive: true, avail: null,
    quote: '"The second stage as your event-long hub: backdrop, chairs, a presentation each day and a two-day branded presence the market walks through all event."',
    bullets: 'Event-long exclusive Stage 2 hub across both days\nBackdrop branding around the two stage screens\nDelegate-chair branding\n2x branded columns (C and D), designed by partner\nA 20-minute presentation on Stage 2 each day, delivered by your C-level speaker\nFull brand ownership of the content, within event guidelines\nSlide support and AV production\n"Powered by" brand integration in the session title\nYour logo on screen during the session\nYou shape the presentations\' content, in collaboration with the NEXT.io production and conference content team\nFull two-day hub presence\nWebsite and social visibility\nLogo at the end of the post-event aftermovie\nLogo on the sponsor wall and in the logo loop on the digital screens, designed by NEXT.io\n3 Full Event passes + 1 Speaker pass\n⚠️ Either/or route with the two per-day Stage 2 partnerships - never sold together.\n⚠️ The NEXT.io conference content team approves the presentation for quality.\n⚠️ If artwork is not received by the deadline, only your logo is placed, on a solid colour background.',
    impact: ['Brand Awareness', 'Thought Leadership'], type: ['Speaking & Content', 'Branding & Visibility'] },
  { id: 18, cat: 'Stage 2 Hub', title: 'Stage 2 Partner (Per Day)', price: 65000, exclusive: false, avail: 2,
    quote: '"Own the second stage for a full day: backdrop, chair branding, a 20-minute presentation and a one-day hub presence built around your brand."',
    bullets: 'Stage 2 backdrop branding around the two stage screens\nDelegate-chair branding\n2x branded columns (C and D), designed by partner\nA 20-minute presentation on Stage 2 on your day, delivered by your C-level speaker\nFull brand ownership of the content, within event guidelines\nSlide support and AV production\n"Powered by" brand integration in the session title\nYour logo on screen during the session\nYou shape the presentation\'s content, in collaboration with the NEXT.io production and conference content team\nFull one-day hub presence\nWebsite and social visibility\nLogo at the end of the post-event aftermovie\nLogo on the sponsor wall and in the logo loop on the digital screens, designed by NEXT.io\n3 Full Event passes + 1 Speaker pass\n📅 One Day 1 and one Day 2 partnership available.\n⚠️ Either/or route with the both-days exclusive - never sold together.\n⚠️ The NEXT.io conference content team approves the presentation for quality.\n⚠️ If artwork is not received by the deadline, only your logo is placed, on a solid colour background.',
    impact: ['Brand Awareness', 'Thought Leadership'], type: ['Speaking & Content', 'Branding & Visibility'] },
  { id: 19, cat: 'Stage 2 Hub', title: 'Stage 2 Presenter', price: 55000, exclusive: false, avail: 2,
    quote: '"Twenty minutes of your own content: your C-level\'s keynote on Stage 2, with no panel to share it and your brand\'s name on the session across the agenda and the website."',
    bullets: '20-minute C-level keynote\nFull brand ownership of the content, within event guidelines\nYou shape the title, topic and format, in collaboration with the NEXT.io production and conference content team\nFull AV and production support\n"Presented by" session title on agenda and website\n2 Full Event passes + 1 Speaker pass\n📅 One slot per day, subject to programme.\n⚠️ Sold for a day without a Stage 2 partner: every Stage 2 partnership includes that day\'s presentation.\n⚠️ The NEXT.io conference content team approves the presentation for quality.',
    impact: ['Thought Leadership'], type: ['Speaking & Content'] },
  { id: 20, cat: 'Stage 2 Hub', title: 'Stage 2 Custom Session', price: 40000, exclusive: false, avail: 2,
    quote: '"Your two speakers on Stage 2 in a session presented by your brand, shaped with the NEXT.io content team, who add two more voices."',
    bullets: '2 speakers nominated by you, plus 2 added by the NEXT.io content team\n20-30 minute session\nYou shape the title, topic and description, in collaboration with the NEXT.io production and conference content team\n"Presented by" session title on agenda, website and screens\nLogo on the sponsor wall and in the logo loop on the digital screens, designed by NEXT.io\nShared pre-event welcome post on social media, designed and posted by NEXT.io\n1 Full Event pass + 2 Speaker passes\n📅 One slot per day, subject to content approval.\n⚠️ The content team adds 2 further speakers; you have no veto over these selections.',
    impact: ['Thought Leadership'], type: ['Speaking & Content'] },
  { id: 21, cat: 'Stage 2 Hub', title: 'Stage 2 Branded Session', price: 25000, exclusive: false, avail: 4,
    quote: '"A \'Powered by\' Stage 2 session: 25-30 minutes with your C-level speaker and your brand on the room."',
    bullets: '"Powered by" session, 25-30 minutes\n1 C-level speaker nominated by you\nSession branding on agenda, website and screens\nLogo on the sponsor wall and in the logo loop on the digital screens, designed by NEXT.io\nShared pre-event welcome post on social media, designed and posted by NEXT.io\n1 Full Event pass + 1 Speaker pass\n📅 Four slots across the two days, subject to programme.\n⚠️ The content team controls all other speakers, topic, format and placement.',
    impact: ['Thought Leadership'], type: ['Speaking & Content'] },
  { id: 22, cat: 'Stage 2 Hub', title: 'Stage 2 Non-Branded Panel', price: 16000, exclusive: false, avail: 4,
    quote: '"Curated Stage 2 panel participation - editorial format, C-level conversation, your leadership in the room."',
    bullets: 'Curated panel participation, 20-30 minutes\n1 C-level speaker nominated by you, no brand attribution\nPartner logo on the website\nLogo on the sponsor wall and in the logo loop on the digital screens, designed by NEXT.io\nShared pre-event welcome post on social media, designed and posted by NEXT.io\n1 Speaker pass\n📅 Programme-controlled inventory.\n⚠️ The content team controls the topic, title, all other speakers and the format.',
    impact: ['Thought Leadership'], type: ['Speaking & Content'] },

  // Stage 3 Hub
  { id: 24, cat: 'Stage 3 Hub', title: 'Stage 3 Partner (Day 1)', price: 33000, exclusive: true, avail: null,
    quote: '"A full day of Stage 3 ownership: stage branding, chair branding, a holding slide, a 20-minute presentation and a one-day hub presence."',
    bullets: 'Branding on stage returns and content-screen surrounds\nChair branding and branded holding slide\nA 20-minute presentation on Stage 3 on Day 1, delivered by your C-level speaker\nFull brand ownership of the content, within event guidelines\nSlide support and AV production\n"Powered by" brand integration in the session title\nYour logo on screen during the session\nYou shape the presentation\'s content, in collaboration with the NEXT.io production and conference content team\nFull one-day hub presence\nWebsite and social visibility\nLogo at the end of the post-event aftermovie\nLogo on the sponsor wall and in the logo loop on the digital screens, designed by NEXT.io\n2 Full Event passes + 1 Speaker pass\n📅 One partnership available. Stage 3 runs its panel programme on Day 1; Day 2 is the workshop track.\n⚠️ The NEXT.io conference content team approves the presentation for quality.\n⚠️ If artwork is not received by the deadline, only your logo is placed, on a solid colour background.',
    impact: ['Brand Awareness', 'Thought Leadership'], type: ['Speaking & Content', 'Branding & Visibility'] },
  { id: 25, cat: 'Stage 3 Hub', title: 'Stage 3 Presenter', price: 30000, exclusive: true, avail: null,
    quote: '"The only Presenter slot on Stage 3: twenty minutes of your own content, delivered by your C-level and presented by your brand on the agenda and the website."',
    bullets: '20-minute C-level keynote\nFull brand ownership of the content, within event guidelines\nYou shape the title, topic and format, in collaboration with the NEXT.io production and conference content team\nFull AV and production support\n"Presented by" session title on agenda and website\n1 Full Event pass + 1 Speaker pass\n📅 Exclusive - one slot, Day 1 only.\n⚠️ Either/or route with the Stage 3 Partner, whose partnership includes the Day 1 presentation - never sold together.\n⚠️ The NEXT.io conference content team approves the presentation for quality.',
    impact: ['Thought Leadership'], type: ['Speaking & Content'] },
  { id: 26, cat: 'Stage 3 Hub', title: 'Stage 3 Custom Session', price: 21500, exclusive: false, avail: 1,
    quote: '"The most accessible custom session: your two speakers in a Stage 3 conversation presented by your brand, shaped with the NEXT.io content team."',
    bullets: '2 speakers nominated by you, plus 2 added by the NEXT.io content team\n20-30 minute session\nYou shape the title, topic and description, in collaboration with the NEXT.io production and conference content team\n"Presented by" session title on agenda, website and screens\nLogo on the sponsor wall and in the logo loop on the digital screens, designed by NEXT.io\nShared pre-event welcome post on social media, designed and posted by NEXT.io\n2 Speaker passes\n📅 Current availability is exclusive to Day 1.\n⚠️ The content team adds 2 further speakers; you have no veto over these selections.',
    impact: ['Thought Leadership'], type: ['Speaking & Content'] },
  { id: 27, cat: 'Stage 3 Hub', title: 'Stage 3 Branded Session', price: 13500, exclusive: false, avail: 2,
    quote: '"The entry point to branded stage time: a \'Powered by\' Stage 3 session with your C-level speaker."',
    bullets: '"Powered by" session, 25-30 minutes\n1 C-level speaker nominated by you\nSession branding on agenda, website and screens\nLogo on the sponsor wall and in the logo loop on the digital screens, designed by NEXT.io\nShared pre-event welcome post on social media, designed and posted by NEXT.io\n1 Speaker pass\n📅 Current availability is exclusive to Day 1.\n⚠️ The content team controls all other speakers, topic, format and placement.',
    impact: ['Thought Leadership'], type: ['Speaking & Content'] },
  { id: 28, cat: 'Stage 3 Hub', title: 'Stage 3 Non-Branded Panel', price: 10000, exclusive: false, avail: 2,
    quote: '"Curated Stage 3 panel participation - the most accessible route to a speaking position at the event."',
    bullets: 'Curated panel participation, 20-30 minutes\n1 C-level speaker nominated by you, no brand attribution\nPartner logo on the website\nLogo on the sponsor wall and in the logo loop on the digital screens, designed by NEXT.io\nShared pre-event welcome post on social media, designed and posted by NEXT.io\n1 Speaker pass\n📅 Two slots on Day 1.\n⚠️ The content team controls the topic, title, all other speakers and the format.',
    impact: ['Thought Leadership'], type: ['Speaking & Content'] },

  // Workshops & Curated Networking
  { id: 29, cat: 'Workshops & Curated Networking', title: 'Curated Workshop + 5 Curated Opt-In Invites', price: 85000, exclusive: false, avail: 3,
    quote: '"Run the room you actually want to be in. A targeted workshop for your team plus five curated opt-in invitations to the accounts you name."',
    bullets: 'Host a targeted 90-minute workshop\n5 curated opt-in invite targets with facilitated invitations\nWebsite and social visibility\nLogo at the end of the post-event aftermovie\nLogo on the sponsor wall and in the logo loop on the digital screens, designed by NEXT.io\nOnsite filmed interview with the NEXT.io media team\n3 Full Event passes + 1 Speaker pass\n⚠️ Invitations are facilitated on an opt-in basis - attendance is not guaranteed.',
    impact: ['Deal Flow', 'Lead Generation', 'Thought Leadership'], type: ['Speaking & Content', 'Networking & Hospitality'] },
  { id: 30, cat: 'Workshops & Curated Networking', title: 'Curated Introduction Package', price: 15000, exclusive: false, avail: 3,
    quote: '"Six introductions that matter more than sixty scans. We brief on your targets, match against the room and facilitate opt-in introductions with an outcome summary."',
    bullets: 'Partner brief and target-account matching\nSix facilitated opt-in introductions\nOutcome summary after the event\n⚠️ Introductions are opt-in and subject to mutual approval.',
    impact: ['Deal Flow', 'Lead Generation'], type: ['Networking & Hospitality'] },

  // Exhibition & Start-Up Zone
  { id: 31, cat: 'Exhibition', title: 'Exhibition Stand 6x8, Gallery Showcase, Turnkey', price: 135000, exclusive: true, avail: null,
    quote: '"The largest showcase position on the floor: a 6x8 gallery landmark for a brand that wants to anchor the exhibition."',
    bullets: 'Premium 6x8 landmark position in the gallery\nTurnkey route: NEXT.io designs, builds, breaks down and cleans the stand\nWebsite and floorplan listing\nSignage, furniture and power package included\nBadge scanner tool, subject to registration and data setup\nIndividual pre-event welcome post on social media\nLogo on the partners section of the website\nLogo within the event guide\nLogo at the end of the post-event aftermovie\nLogo on the sponsor wall and in the logo loop on the digital screens, designed by NEXT.io\nOnsite filmed interview with the NEXT.io media team\n4 Full Event passes\n📅 One position available.\n⚠️ Either/or route with the space-only option for the same booth - never sold together.',
    impact: ['Lead Generation', 'Brand Awareness'], type: ['Exhibition'] },
  { id: 32, cat: 'Exhibition', title: 'Exhibition Stand 8x4, Planner Area Showcase, Turnkey', price: 110000, exclusive: true, avail: null,
    quote: '"An 8x4 showcase in the planner area - a landmark footprint where delegates plan their day and the traffic concentrates."',
    bullets: 'Premium 8x4 position in the delegate planning zone\n⚠️ Quantities and positions reflect the reference venue layout - final spec confirmed when the venue is announced\nTurnkey route: NEXT.io designs, builds, breaks down and cleans the stand\nWebsite and floorplan listing\nSignage, furniture and power package included\nBadge scanner tool, subject to registration and data setup\nIndividual pre-event welcome post on social media\nLogo on the partners section of the website\nLogo within the event guide\nLogo at the end of the post-event aftermovie\nLogo on the sponsor wall and in the logo loop on the digital screens, designed by NEXT.io\nOnsite filmed interview with the NEXT.io media team\n4 Full Event passes\n📅 One position available.\n⚠️ Either/or route with the space-only option for the same booth - never sold together.',
    impact: ['Lead Generation', 'Brand Awareness'], type: ['Exhibition'] },
  { id: 33, cat: 'Exhibition', title: 'Exhibition Stand 6x4, Premium Gallery Position, Turnkey', price: 75000, exclusive: true, avail: null,
    quote: '"Gallery visibility without the landmark footprint: a 6x4 stand in a top gallery position, with the same four Full Event passes and pre-event welcome post as the showcase stands."',
    bullets: 'Premium 6x4 gallery position with top visibility\nTurnkey route: NEXT.io designs, builds, breaks down and cleans the stand, with furniture and power included\nWebsite and floorplan listing\nAgreed signage package\nBadge scanner tool, subject to registration and data setup\nIndividual pre-event welcome post on social media\nLogo on the partners section of the website\nLogo within the event guide\nLogo at the end of the post-event aftermovie\nLogo on the sponsor wall and in the logo loop on the digital screens, designed by NEXT.io\nOnsite filmed interview with the NEXT.io media team\n4 Full Event passes\n📅 One position available.\n⚠️ Either/or route with the space-only option for the same booth - never sold together.',
    impact: ['Lead Generation', 'Brand Awareness'], type: ['Exhibition'] },
  { id: 57, cat: 'Exhibition', title: 'Exhibition Stand 6x2, Turnkey', price: 60000, exclusive: false, avail: 6,
    quote: '"A double-width turnkey footprint on the cluster floor - room for a working team and a meeting corner without a landmark build."',
    bullets: 'Branded 6x2 physical footprint, formed from two adjacent 3x2 cluster positions - it is not separate stock\nTurnkey format: standard furniture and power package included\nAdditional meeting space and clearer floor presence than a single cluster unit\nWebsite and floorplan listing\nAgreed signage package\nBadge scanner tool, subject to registration and data setup\nLogo on the partners section of the website\nLogo within the event guide\nLogo at the end of the post-event aftermovie\nDaily clean\nWi-Fi included, provided by NEXT.io\nLogo on the sponsor wall and in the logo loop on the digital screens, designed by NEXT.io\nShared pre-event welcome post on social media, designed and posted by NEXT.io\n3 Full Event passes\n📅 Limited: every 6x2 built removes two 3x2 positions from the twelve-position cluster pool, so a maximum of six can be built.',
    impact: ['Lead Generation', 'Brand Awareness'], type: ['Exhibition'] },
  { id: 34, cat: 'Exhibition', title: 'Exhibition Stand 3x2, Turnkey', price: 33000, exclusive: false, avail: 12,
    quote: '"The core exhibition product: a turnkey 3x2 branded footprint on the floor where the market does its walking."',
    bullets: 'Branded 3x2 physical footprint\nTurnkey format: standard furniture and power package included\nWebsite and floorplan listing\nAgreed signage package\nBadge scanner tool, subject to registration and data setup\nLogo on the partners section of the website\nLogo within the event guide\nLogo at the end of the post-event aftermovie\nDaily clean\nWi-Fi included, provided by NEXT.io\nLogo on the sponsor wall and in the logo loop on the digital screens, designed by NEXT.io\nShared pre-event welcome post on social media, designed and posted by NEXT.io\n2 Full Event passes\n📅 Twelve positions available. For a double-width footprint, see the 6x2 Turnkey stand.',
    impact: ['Lead Generation', 'Brand Awareness'], type: ['Exhibition'] },

  // Private Meeting Rooms
  { id: 37, cat: 'Private Meeting Rooms', title: 'Private Meeting Room, 12 Person', price: 62000, exclusive: true, avail: null,
    quote: '"Your own boardroom inside the event: a private branded room for 12, yours for both days, for the meetings that need a door."',
    bullets: 'Private branded meeting room for both event days\nTable and 12 chairs\nTV screen and directional signage\nBranded merchandise option\nSummit-wide general branding\nLogo on plaque outside the meeting room door, designed by NEXT.io\nLogo on the partners section of the website\nShared pre-event welcome post on social media, designed and posted by NEXT.io\n3 Full Event passes\n⚠️ Using the TV screen for your branding means it cannot show other content in the room.',
    impact: ['Deal Flow'], type: ['Networking & Hospitality'] },
  { id: 38, cat: 'Private Meeting Rooms', title: 'Private Meeting Room, 8 Person', price: 38500, exclusive: true, avail: null,
    quote: '"A private branded room for eight, yours for both days: deal space for a team that runs a full meeting diary."',
    bullets: 'Private branded meeting room for both event days\nTable and 8 chairs\nTV screen and directional signage\nBranded merchandise option\nSummit-wide general branding\nLogo on plaque outside the meeting room door, designed by NEXT.io\nLogo on the partners section of the website\nShared pre-event welcome post on social media, designed and posted by NEXT.io\n2 Full Event passes\n⚠️ Using the TV screen for your branding means it cannot show other content in the room.',
    impact: ['Deal Flow'], type: ['Networking & Hospitality'] },
  { id: 39, cat: 'Private Meeting Rooms', title: 'Private Meeting Room, 6 Person', price: 31000, exclusive: true, avail: null,
    quote: '"Both teams at one table: a private branded room for six, yours for both event days, away from the floor."',
    bullets: 'Private branded meeting room for both event days\nTable and 6 chairs\nTV screen and directional signage\nBranded merchandise option\nSummit-wide general branding\nLogo on plaque outside the meeting room door, designed by NEXT.io\nLogo on the partners section of the website\nShared pre-event welcome post on social media, designed and posted by NEXT.io\n2 Full Event passes\n⚠️ Using the TV screen for your branding means it cannot show other content in the room.',
    impact: ['Deal Flow'], type: ['Networking & Hospitality'] },
  { id: 40, cat: 'Private Meeting Rooms', title: 'Private Meeting Room, 4 Person', price: 25000, exclusive: true, avail: null,
    quote: '"A private branded room for four, yours for both days: the most efficient deal space on the card."',
    bullets: 'Private branded meeting room for both event days\nTable and 4 chairs\nTV screen and directional signage\nBranded merchandise option\nSummit-wide general branding\nLogo on plaque outside the meeting room door, designed by NEXT.io\nLogo on the partners section of the website\nShared pre-event welcome post on social media, designed and posted by NEXT.io\n2 Full Event passes\n📅 One room available.\n⚠️ Using the TV screen for your branding means it cannot show other content in the room.',
    impact: ['Deal Flow'], type: ['Networking & Hospitality'] },

  // Hospitality & Lounges
  { id: 41, cat: 'Hospitality & Lounges', title: 'Meeting Area Sponsor', price: 77000, exclusive: true, avail: null,
    quote: '"Own the room where the meetings happen: the meeting and dining area, branded for both days."',
    bullets: 'Meeting and dining area branding across both event days\nRefreshment bar backdrop branding\nCredenza branding\nDigital display and projector visibility\nSummit-wide general branding\nLogo on the partners section of the website\nShared pre-event welcome post on social media, designed and posted by NEXT.io\n4 Full Event passes\n⚠️ The area also carries one projector screen and one TV used for other partners\' video ads.',
    impact: ['Brand Awareness', 'Deal Flow'], type: ['Networking & Hospitality', 'Branding & Visibility'] },
  { id: 42, cat: 'Hospitality & Lounges', title: 'Gallery Nourish Bars, Exclusive (All Three)', price: 75000, exclusive: true, avail: null,
    quote: '"Every coffee, every refuel, your brand: exclusive ownership of all three Nourish Bars, with branded cups across the catering points."',
    bullets: 'Exclusive branding across all three Nourish Bars\n⚠️ Quantities and positions reflect the reference venue layout - final spec confirmed when the venue is announced\nBranded cups across the catering points\nSummit-wide general branding\nWebsite and social visibility\nLogo at the end of the post-event aftermovie\nOpportunity to place merchandise giveaways on the dining tables, optional and supplied by you\n4 Full Event passes\n⚠️ Either/or route with the three individual Nourish Bar sponsorships - never sold together.',
    impact: ['Brand Awareness'], type: ['Networking & Hospitality', 'Branding & Visibility'] },
  { id: 43, cat: 'Hospitality & Lounges', title: 'Nourish Bar Sponsor', price: 28500, exclusive: false, avail: 3,
    quote: '"High-frequency hospitality branding: one of the three Nourish Bars, where every delegate returns several times a day."',
    bullets: 'Branding across one gallery Nourish Bar and its credenzas\nSummit-wide general branding\nWebsite and social visibility\nLogo at the end of the post-event aftermovie\n2 Full Event passes\n📅 Three bars available individually.\n⚠️ Either/or route with the all-three exclusive - never sold together.',
    impact: ['Brand Awareness'], type: ['Networking & Hospitality', 'Branding & Visibility'] },
  { id: 44, cat: 'Hospitality & Lounges', title: "Speakers' Lounge Sponsor", price: 54000, exclusive: true, avail: null,
    quote: '"Your brand around every speaker at the event: the VIP speakers lounge, hosted under your name for both days."',
    bullets: 'VIP speakers lounge branding across both event days\nVideo advertisement in the lounge\nFood and drink station at breakfast and lunch on both days\nSummit-wide general branding\n2x branded plaques outside the lounge, designed by NEXT.io\nOpportunity to provide merchandise, optional and supplied by you\nLogo on the partners section of the website\nShared pre-event welcome post on social media, designed and posted by NEXT.io\n3 Full Event passes',
    impact: ['Brand Awareness', 'Thought Leadership'], type: ['Networking & Hospitality', 'Branding & Visibility'] },

  // Media & Content
  { id: 45, cat: 'Media & Content', title: 'Livestream Sponsor', price: 92500, exclusive: true, avail: null,
    quote: '"Reach the market that could not fly in. The livestream carries the event beyond the room - with your brand on every frame."',
    bullets: 'Logo on the event livestream\nBranded video in stream breaks\nPre-event and daily social promotion\nEmail promotion before the stream goes live\nSponsor-use livestream link for your own channels\nSummit-wide general branding\nOnsite filmed interview with the NEXT.io media team\nLogo on the partners section of the website\nIndividual pre-event welcome post on social media, designed and posted by NEXT.io\n4 Full Event passes',
    impact: ['Brand Awareness', 'Thought Leadership'], type: ['Media'] },
  { id: 46, cat: 'Media & Content', title: 'Media Zone Sponsor', price: 65000, exclusive: true, avail: null,
    quote: '"The room where the interviews happen: your brand on the media zone and its backdrop, both days, seen in the videos NEXT.io records there."',
    bullets: 'Media zone branding across both event days\nWelcome-area and backdrop branding\nDedicated social promotion\nSummit-wide general branding\nMicrophones and set-up equipment provided by NEXT.io\nNEXT.io media team can share footage on request\nLogo on the partners section of the website\nShared pre-event welcome post on social media, designed and posted by NEXT.io\n3 Full Event passes\n⚠️ Interview formats and content slots are scoped with the NEXT.io media team at contract.\n⚠️ NEXT.io holds the content rights to the interviews.',
    impact: ['Brand Awareness', 'Thought Leadership'], type: ['Media'] },
  { id: 47, cat: 'Media & Content', title: 'Press Lounge Sponsor', price: 22000, exclusive: true, avail: null,
    quote: '"Host the press. Exclusive branding of the press lounge puts your name in front of every journalist covering the event."',
    bullets: 'Exclusive press lounge branding across both event days\nHosted presence in front of attending media\nSummit-wide general branding\nWebsite and social visibility\nLogo at the end of the post-event aftermovie\nTables and chairs provided by NEXT.io\n2 Full Event passes',
    impact: ['Brand Awareness'], type: ['Media'] },
  { id: 48, cat: 'Media & Content', title: 'Advertisement Video', price: 13500, exclusive: false, avail: 8,
    quote: '"Your 30-second video plays between sessions and on the gallery video wall, out on the floor with the exhibition stands and the Nourish Bars."',
    bullets: '30-second video played during conference breaks\nPlacement on the gallery video wall\nSummit-wide general branding\nWebsite and shared social visibility\nLogo at the end of the official aftermovie\nVideo designed and supplied by you\n1 Full Event pass\n📅 Eight placements available.',
    impact: ['Brand Awareness'], type: ['Media', 'Branding & Visibility'] },

  // Venue Branding
  { id: 49, cat: 'Venue Branding', title: 'Online & Onsite Registration Sponsor', price: 110000, exclusive: true, avail: null,
    quote: '"Every attendee sees your brand before the first session: online when they register, then at the branded desk and the LED screens when they arrive."',
    bullets: 'Branding on the registration page, confirmation emails and digital tickets\nOnsite registration area branding\n2 curved LED screens at registration\n⚠️ Quantities and positions reflect the reference venue layout - final spec confirmed when the venue is announced\nBranded registration desk\nSummit-wide general branding\nOnsite filmed interview with the NEXT.io media team\nLogo on the agenda section of the website\nLogo on the partners section of the website\nShared pre-event welcome post on social media, designed and posted by NEXT.io\n4 Full Event passes\n⚠️ Screen content is a static graphic with text, logos or images.\n⚠️ The two screens mirror each other by default.\n⚠️ Designs include the NEXTPredict logo and follow the brand guidelines.',
    impact: ['Brand Awareness', 'Lead Generation'], type: ['Branding & Visibility'] },
  { id: 50, cat: 'Venue Branding', title: 'Cloakroom Sponsor', price: 32000, exclusive: true, avail: null,
    quote: '"Seen on the way in and on the way out, both days: the cloakroom, its counter and an LCD screen carry your brand."',
    bullets: 'Cloakroom branding across both event days\n1 LCD screen in the cloakroom area\nCounter branding\nSummit-wide general branding\nWebsite and social visibility\nLogo at the end of the post-event aftermovie\n2 Full Event passes',
    impact: ['Brand Awareness'], type: ['Branding & Visibility'] },
  { id: 51, cat: 'Venue Branding', title: 'Stair Risers Sponsor', price: 31000, exclusive: true, avail: null,
    quote: '"In the eyeline of every arrival: fifteen branded stair risers behind registration and an LCD video advertisement."',
    bullets: 'Branding across 15 stair risers behind registration\n⚠️ Quantities and positions reflect the reference venue layout - final spec confirmed when the venue is announced\nLCD video advertisement\nSummit-wide general branding\nLogo on the partners section of the website\nShared pre-event welcome post on social media, designed and posted by NEXT.io\n2 Full Event passes',
    impact: ['Brand Awareness'], type: ['Branding & Visibility'] },
  { id: 52, cat: 'Venue Branding', title: 'Badge Sponsor', price: 32000, exclusive: true, avail: null,
    quote: '"On every attendee, from check-in to the last session: your logo in every conversation, every meeting and every photo."',
    bullets: 'Logo on all delegate badges\nSummit-wide general branding\nWebsite and shared social visibility\nLogo at the end of the official aftermovie\n2 Full Event passes',
    impact: ['Brand Awareness'], type: ['Branding & Visibility'] },
  { id: 53, cat: 'Venue Branding', title: 'Lanyard Sponsor', price: 45000, exclusive: false, avail: 2,
    quote: '"Around the neck of half the room, both days, or all of it with both units: in every conversation, every meeting and every photo."',
    bullets: 'Sold as two units - each unit brands one of the two lanyard designs, roughly half of all delegates\nSummit-wide general branding\nWebsite and social visibility\nLogo at the end of the post-event aftermovie\nLanyard colour chosen by you from our supplier\'s chart, produced by NEXT.io\n2 Full Event passes\n📅 Two units available - take both for full lanyard coverage.',
    impact: ['Brand Awareness'], type: ['Branding & Visibility'] },
  { id: 54, cat: 'Venue Branding', title: 'Restroom Sponsorship', price: 28000, exclusive: true, avail: null,
    quote: '"Guaranteed reach, zero competition: every restroom at the venue carries your brand, and no other."',
    bullets: 'Branding across all venue restrooms\nMirror vinyls and clings\n⚠️ Quantities and positions reflect the reference venue layout - final spec confirmed when the venue is announced\n12 branded toiletry baskets\nBranded merchandise option\nExclusive category visibility\nWebsite and social visibility\nLogo at the end of the post-event aftermovie\nLogo on the sponsor wall and in the logo loop on the digital screens, designed by NEXT.io\n2 Full Event passes',
    impact: ['Brand Awareness'], type: ['Branding & Visibility'] },
  { id: 55, cat: 'Venue Branding', title: 'Digital Event Guide Sponsor', price: 35000, exclusive: true, avail: null,
    quote: '"Every time an attendee checks the agenda, they see you: your logo and QR code on every badge, on the digital agenda and on QR table tents."',
    bullets: 'Logo and QR code on the badge linking to the agenda\nLogo on the digital agenda\nBranded QR table tents across the venue\nSummit-wide general branding\nWebsite and social visibility\nLogo at the end of the post-event aftermovie\n2 Full Event passes',
    impact: ['Brand Awareness'], type: ['Branding & Visibility'] },
  { id: 56, cat: 'Venue Branding', title: 'Wi-Fi Sponsor', price: 28000, exclusive: true, avail: null,
    quote: '"Every attendee who gets online types your brand: the network name and password are yours."',
    bullets: 'Logo on delegate badges in the Wi-Fi section\nCustom network name and password\nSummit-wide general branding\nWebsite and social visibility\nLogo at the end of the post-event aftermovie\n2 Full Event passes\n⚠️ Network name and password: 8 to 32 characters, case sensitive; the only special characters allowed are ! and @.',
    impact: ['Brand Awareness'], type: ['Branding & Visibility'] },
  { id: 58, cat: 'Exhibition', title: 'Exhibition Stand 6x8, Gallery Showcase, Space Only', price: 119000, exclusive: true, avail: null,
    quote: '"The largest showcase position on the floor, space only: a 6x8 gallery landmark for a brand that wants to anchor the exhibition."',
    bullets: 'Premium 6x8 landmark position in the gallery\nSpace-only route: the partner designs and builds the stand at their own cost\nWebsite and floorplan listing\nNEXT.io can introduce a stand-build supplier on request\nBadge scanner tool, subject to registration and data setup\nIndividual pre-event welcome post on social media\nLogo on the partners section of the website\nLogo within the event guide\nLogo at the end of the post-event aftermovie\nLogo on the sponsor wall and in the logo loop on the digital screens, designed by NEXT.io\nOnsite filmed interview with the NEXT.io media team\n4 Full Event passes\n📅 One position available.\n⚠️ Either/or route with the turnkey option for the same booth - never sold together.',
    impact: ['Lead Generation', 'Brand Awareness'], type: ['Exhibition'] },
  { id: 59, cat: 'Exhibition', title: 'Exhibition Stand 8x4, Planner Area Showcase, Space Only', price: 97000, exclusive: true, avail: null,
    quote: '"An 8x4 showcase in the planner area - a landmark footprint where delegates plan their day and the traffic concentrates."',
    bullets: 'Premium 8x4 position in the delegate planning zone\n⚠️ Quantities and positions reflect the reference venue layout - final spec confirmed when the venue is announced\nSpace-only route: the partner designs and builds the stand at their own cost\nWebsite and floorplan listing\nNEXT.io can introduce a stand-build supplier on request\nBadge scanner tool, subject to registration and data setup\nIndividual pre-event welcome post on social media\nLogo on the partners section of the website\nLogo within the event guide\nLogo at the end of the post-event aftermovie\nLogo on the sponsor wall and in the logo loop on the digital screens, designed by NEXT.io\nOnsite filmed interview with the NEXT.io media team\n4 Full Event passes\n📅 One position available.\n⚠️ Either/or route with the turnkey option for the same booth - never sold together.',
    impact: ['Lead Generation', 'Brand Awareness'], type: ['Exhibition'] },
  { id: 60, cat: 'Exhibition', title: 'Exhibition Stand 6x4, Premium Gallery Position, Space Only', price: 66000, exclusive: true, avail: null,
    quote: '"Gallery visibility without the landmark footprint: a 6x4 stand in a top gallery position, with the same four Full Event passes and pre-event welcome post as the showcase stands."',
    bullets: 'Premium 6x4 gallery position with top visibility\nSpace-only route: the partner designs and builds the stand at their own cost\nWebsite and floorplan listing\nAgreed signage package\nBadge scanner tool, subject to registration and data setup\nIndividual pre-event welcome post on social media\nLogo on the partners section of the website\nLogo within the event guide\nLogo at the end of the post-event aftermovie\nLogo on the sponsor wall and in the logo loop on the digital screens, designed by NEXT.io\nOnsite filmed interview with the NEXT.io media team\n4 Full Event passes\n📅 One position available.\n⚠️ Either/or route with the turnkey option for the same booth - never sold together.',
    impact: ['Lead Generation', 'Brand Awareness'], type: ['Exhibition'] },
]

// ─── SALES DESK ─────────────────────────────────────────────────────────────
// To mark a product sold or reserved, add a line here and redeploy, e.g.
//   'Leadership Stage Partner': 'sold',
//   'Wi-Fi Sponsor': 'reserved',
const PRODUCT_STATUS = {
}
pricing.forEach((p) => { if (PRODUCT_STATUS[p.title]) p.status = PRODUCT_STATUS[p.title] })

// Exclusive and shared routes over the same physical inventory cannot be bought together
const CONFLICTS = {
  2: [5], 5: [2],    // Day 1 NEXTworking: exclusive vs non-exclusive
  3: [6], 6: [3],    // Day 2 NEXTworking: exclusive vs non-exclusive
  4: [7], 7: [4],    // Pre-Registration Event: exclusive vs non-exclusive
  17: [18, 19], 18: [17, 19], // Stage 2: both-days exclusive vs per-day
  // One presentation per stage per day, and the stage's partner has it, so a
  // stand-alone presenter never sits beside it in a plan (Stuart, 27 Sep 2026).
  19: [17, 18], // Stage 2 Presenter vs both Stage 2 partner routes
  24: [25], 25: [24], // Stage 3 Partner (Day 1) vs Stage 3 Presenter (Day 1)
  42: [43], 43: [42], // Nourish Bars: all-three exclusive vs individual
  31: [58], 58: [31], // Exhibition booth: turnkey vs space-only
  32: [59], 59: [32], // Exhibition booth: turnkey vs space-only
  33: [60], 60: [33], // Exhibition booth: turnkey vs space-only
}

const categories = [...new Set(pricing.map((p) => p.cat))]
const impacts = [...new Set(pricing.flatMap((p) => p.impact))]
const types = [...new Set(pricing.flatMap((p) => p.type))]

// ─── Ticket ladder (public rates, USD) ──────────────────────────────────────
// The gated Start-up rate is deliberately not on the card (see CLAUDE.md):
// the Start-Up Pass box below describes it without a price.
const ticketLadder = [
  { type: 'VIP', eb: 2199, std: 2999, late: 3399, note: 'Premium all-event access with first-priority networking.' },
  { type: 'Full Event', eb: 1299, std: 1799, late: 2099, note: 'The core pass: full programme plus the main networking events.' },
  { type: 'Conference Only', eb: 949, std: 1249, late: 1449, note: 'Both conference days, without the evening networking programme.' },
  { type: 'Day Pass', eb: 779, std: 1079, late: 1259, note: 'One event day of your choice, including that evening’s event.' },
  { type: 'Operator & Regulator', eb: 650, std: 900, late: 1050, note: 'Verified operators and regulators. Verification required at checkout.' },
]
const TICKET_FOOTNOTE = 'Ticket prices in USD. Conference Only excludes the evening networking programme. VIP includes first-priority access to speed networking.'
const TICKET_OFFERS = [
  { title: 'Team of Three', icon: Users,
    body: <>Bring your team: three Full Event passes at <strong className="text-brand-yellow">15% off</strong> the prevailing Full Event stage price. Available in every stage. Not combinable with any other offer.</> },
  { title: 'Start-Up Pass', icon: Sparkles,
    body: <>A gated flat rate for qualifying start-ups - application-based, capped for the event and limited to two per company. Apply via <a className="text-brand-yellow font-semibold" href="mailto:sales@next.io?subject=NEXTPredict 2027 Start-Up Pass">sales@next.io</a>.</> },
  { title: 'Operators & Regulators', icon: Scale,
    body: <>Verified operators and regulators attend at the preferential rate above - roughly half the Full Event price at every stage. Verification is confirmed before the ticket is issued.</> },
]

// ─── Page proof and recognition (shared by the page and Present mode) ───────
// One copy of each line, so a slide can never drift from the page.
const EVENT_STATS = [
  ['2', 'Event Days'],
  ['3', 'Content Stages'],
  ['12+', 'Exhibition Positions'],
  ['3', 'NEXTworking Evenings'],
]
const WHY_PARTNER = {
  title: 'First-Mover Positioning.',
  accent: 'A Verified Room.',
  body: "The demand side is curated on purpose: market makers and traders are hosted, and operators and regulators attend on verified preferential rates - so the room your team works is the room you are paying to meet. Partner visibility runs across the venue, the livestream, NEXT's digital reach (a ~40k LinkedIn following and the daily newsletter database) and the official aftermovie.",
  npsIntro: 'A new event, but not an unproven team - partners score the NEXT Summit editions far above the industry norm:',
}
const NPS_PROOF = [
  ['+69', 'Partner NPS · Valletta 2026 · benchmark +23', true],
  ['+62', 'Partner NPS · New York 2026 · benchmark +21', true],
]
const NPS_SOURCE = 'Partner Net Promoter Scores from the NEXT Summit 2026 post-event surveys; each industry benchmark as that event\u2019s survey report gives it.'

// ─── The 2026 room: NEXT's own audience snapshot ────────────────────────────
// Stuart, 29 Sep 2026: "some of the biggest value for any product, speaking or
// branding, is the access to the audience. And that audience is often C-level
// or director level, and it's also the biggest names, the biggest brands, and
// obviously we have press attendance as well."
// The aggregate figures of NEXT's NEXTPredict 2026 Audience Snapshot (Stuart's
// tear sheet), registered as at 28 September 2026, for NEXTPredict 2026 (22-23
// October 2026, Convene, 30 Hudson Yards). They prove who is in the room; they
// are not a headcount promise. A value row (REACH) may carry one of them as a
// measured fact, never as an estimate (estimates wait for the 2026 actuals).
// Every figure travels with ROOM_LABEL. The snapshot's attendee
// rows (job title and company) are never published: a company appears only as
// a logo, never beside a title or a person.
const ROOM_LABEL = 'Registered for NEXTPredict 2026, as at 28 September 2026'
const ROOM_FIGURES = [
  ['61%', 'Director level and above'],
  ['37%', 'Founders and C-suite'],
  ['262', 'Organisations'],
  ['27', 'Countries'],
]
const ROOM_BLOC = ['28%', 'Trading and liquidity, the largest single bloc']
// share of the audience by job title, as the snapshot reports it (director
// level and above is the first four: 61%)
const ROOM_SENIORITY = [
  ['Founder / Owner', 11], ['C-Suite / MD', 26], ['VP / Head of', 15], ['Director', 9],
  ['Manager / Lead', 7], ['Practitioner / Specialist', 16],
]
const ROOM_PRESS = ['The Wall Street Journal', 'Bloomberg', 'Reuters', 'CNBC', 'The New York Times', 'Fortune']
const ROOM_SOURCE = 'Shares of attendees registered for NEXTPredict 2026 (22-23 October 2026, Convene, 30 Hudson Yards) as at 28 September 2026, from the official registration system. Seniority is classified from the job title each attendee gave. Registrations continue until the event.'
const LOGOS_NOTE = 'Logos: a selection of the organisations registered for NEXTPredict 2026 as at 28 September 2026, and the official partners of NEXTPredict 2026.'

// ─── The value row, per product ──────────────────────────────────────────────
// Stuart, 29 Sep 2026, on the Headline's old row (sold once, a 30-second video,
// 13 passes): "Let's be honest, these aren't exactly the best selling points
// for a headliner. They'll be more thinking about getting their brand in front
// of as many people as possible, the ROI of that huge spend, etc. For all these
// numbers across all products, that needs to be the thinking."
// A row answers one question, what do I get back for this money, in at most
// three figures, each through one of five lenses: reach, ROI, leads, brands,
// and networking and introductions. Availability, durations, days, passes,
// stand sizes and item counts stay in "What's included". The figures:
//  - the 2026 room, one figure per product, matched to what it sells:
//    seniority for what people wear and where they gather (badges, lanyards,
//    evenings, lounges, sessions), the 262 organisations for branding across
//    the stages and the venue, the trading and liquidity bloc for stands, the
//    newsrooms for press and media. Always with ROOM_LABEL as the source line;
//  - GA4 views of the summit pages, only where top billing on the site is a
//    lead deliverable (the Headline);
//  - the product's own lines (introductions, invitations, seats at your table);
//  - MEETING, an assumption, for the private rooms;
//  - ATTENDEES_2026, once the actuals are in.
// A cost per figure divides the product's own price by a figure in the same
// row, rounded to the euro, "From" when the divisor is a maximum. Measured facts
// keep the heading "At a glance" and print their source; only an assumption or
// an estimate from the attendance reads "Estimated reach". Never New York's or
// Valletta's audience, a NEXT.io audience, NEXTPredict's own LinkedIn following
// or a headcount from the snapshot. The numbers that would add figures are
// listed in CLAUDE.md.
const EVENT_DAYS = Number(EVENT_STATS.find(([, label]) => label === 'Event Days')[0])
// GA4 (the NEXTPredict property): 141,445 views of nextpredict.io's summit pages
// from 1 Jan to 29 Sep 2026, 135,374 of them of the summit page, which lists
// NEXT's six 2026 Official Event Partners, and 5,437 of its speakers page.
const SUMMIT_VIEWS = '140k+'
// NEXTPredict 2026 attendance (22 to 23 October 2026): null until Stuart has the
// actuals, and nothing renders from it while it is null. Set it to the real
// count and the products every attendee sees gain attendees and € per attendee,
// under "Estimated reach" with the attendance line (see CLAUDE.md).
const ATTENDEES_2026 = null
// A private meeting room, fully booked: 30-minute meetings, 8 hours a day, on
// both event days. An assumption, not an audience.
const MEETING = { minutes: 30, hours: 8 }
const MEETINGS = (60 / MEETING.minutes) * MEETING.hours * EVENT_DAYS
const fmtCount = (x) => Math.round(x).toLocaleString('en-US')
// The sentence printed under a row, by key. An estimate turns the heading to
// "Estimated reach"; a fact prints its source and keeps "At a glance".
const REACH_ESTIMATES = {
  meetings: `Assumes ${MEETING.minutes}-minute meetings, ${MEETING.hours} hours a day, on both event days.`,
  attendance: ATTENDEES_2026 ? `Estimates use the ${fmtCount(ATTENDEES_2026)} attendees at NEXTPredict 2026.` : null,
}
const REACH_FACTS = {
  room: `${ROOM_LABEL}.`,
  views: "GA4 views of nextpredict.io's summit pages, 1 Jan to 29 Sep 2026.",
}
const fig = (value, label, pre) => ({ value: String(value), label, pre })
const row = (basis, ...figs) => ({ basis, figs: figs.filter(Boolean) })
const perHead = (item, people, label, pre) => fig(fmtPrice(Math.round(item.price / people)), label, pre)
// the 2026 room, one figure per product (see above)
const roomShare = (label) => ROOM_FIGURES.find(([, l]) => l === label)[0]
const DIRECTORS = fig(roomShare('Director level and above'), 'Director level and above in the room')
const FOUNDERS = fig(roomShare('Founders and C-suite'), 'Founders and C-suite in the room')
const ORGANISATIONS = fig(roomShare('Organisations'), 'Organisations registered for 2026')
const TRADING = fig(ROOM_BLOC[0], 'Trading and liquidity, the largest bloc')
const NEWSROOMS = fig(ROOM_PRESS.length, 'National and financial newsrooms registered')
const BILLING = fig('#1', 'Billing above every other partner')
const inRoom = (roomFig) => () => row(['room'], roomFig)
// A product every attendee sees (`most`: at most every attendee, the cloakroom
// and the expo floor; `share`: half of them, a lanyard unit). Until the 2026
// attendance is in: its own line's reach (`now`, "All" or "Half") and its room
// figure. Then: the attendees, the room figure and the cost per attendee.
const seenBy = (label, roomFig, { now, share = 1, most = false } = {}) => (i) => (ATTENDEES_2026
  ? row(['attendance', 'room'], fig(fmtCount(ATTENDEES_2026 * share), label, most ? 'Up to' : undefined), roomFig,
    perHead(i, ATTENDEES_2026 * share, 'Per attendee reached', most ? 'From' : undefined))
  : row(['room'], now && fig(now, label), roomFig))
// a count as the product's own line gives it ("Table and 12 chairs", "Six
// facilitated opt-in introductions"), so a changed bullet changes the row
const WORD_COUNT = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 }
const countIn = (item, re) => {
  const m = item.bullets.match(re)[1]
  return WORD_COUNT[m.toLowerCase()] || Number(m)
}
const stand = seenBy('Attendees on your floor, both days', TRADING, { most: true })
const room = (i) => row(['meetings'],
  fig(MEETINGS, 'Meetings at your table, both days', 'Up to'),
  fig(countIn(i, /Table and (\d+) chairs/), 'Seats at your private table'),
  perHead(i, MEETINGS, 'Per meeting, fully booked', 'From'))
const REACH = {
  1: (i) => (ATTENDEES_2026
    ? row(['attendance'], fig(fmtCount(ATTENDEES_2026), 'Attendees see your brand, both days'), BILLING, perHead(i, ATTENDEES_2026, 'Per attendee reached'))
    : row(['views', 'room'], BILLING, fig(SUMMIT_VIEWS, 'Views of the summit pages, 2026'), ORGANISATIONS)),
  // the evenings, both routes alike: the room's seniority (a guest count waits
  // for the 2026 actuals)
  2: inRoom(DIRECTORS), 5: inRoom(DIRECTORS),
  3: inRoom(DIRECTORS), 6: inRoom(DIRECTORS),
  4: inRoom(DIRECTORS), 7: inRoom(DIRECTORS),
  8: inRoom(FOUNDERS),
  // the stages: a stage partner brands the stage and the summit; a speaker faces
  // the room (the C-suite for a C-level presentation or a powered-by session)
  10: inRoom(ORGANISATIONS), 17: inRoom(ORGANISATIONS), 18: inRoom(ORGANISATIONS), 24: inRoom(ORGANISATIONS),
  11: inRoom(FOUNDERS), 19: inRoom(FOUNDERS), 25: inRoom(FOUNDERS),
  15: inRoom(FOUNDERS), 21: inRoom(FOUNDERS), 27: inRoom(FOUNDERS),
  13: inRoom(DIRECTORS), 20: inRoom(DIRECTORS), 26: inRoom(DIRECTORS),
  16: inRoom(DIRECTORS), 22: inRoom(DIRECTORS), 28: inRoom(DIRECTORS),
  14: inRoom(DIRECTORS),
  29: (i) => row(['room'], fig(countIn(i, /^(\d+) curated opt-in invite targets/m), 'Curated invitations to your targets'), FOUNDERS),
  30: (i) => {
    const intros = countIn(i, /^(\w+) facilitated opt-in introductions/m)
    return row(['room'], fig(intros, 'Curated introductions to your targets'), ORGANISATIONS, perHead(i, intros, 'Per introduction'))
  },
  31: stand, 58: stand, 32: stand, 59: stand, 33: stand, 60: stand, 57: stand, 34: stand,
  37: room, 38: room, 39: room, 40: room,
  41: inRoom(DIRECTORS), 44: inRoom(FOUNDERS),
  42: inRoom(ORGANISATIONS), 43: inRoom(ORGANISATIONS),
  // 45, the livestream, has no row until NEXTPredict 2026 reports its viewers
  46: inRoom(NEWSROOMS), 47: inRoom(NEWSROOMS),
  48: inRoom(ORGANISATIONS),
  49: seenBy('Attendees, from sign-up to check-in', ORGANISATIONS, { now: 'All' }),
  50: seenBy('Attendees can use your cloakroom', ORGANISATIONS, { most: true }),
  51: seenBy('Attendees check in facing your risers', ORGANISATIONS),
  52: seenBy('Attendees wear your logo, both days', DIRECTORS, { now: 'All' }),
  53: seenBy('Attendees wear your lanyard', FOUNDERS, { now: 'Half', share: 0.5 }),
  54: seenBy('Attendees use your branded restrooms', ORGANISATIONS),
  55: seenBy('Attendees carry your agenda QR code', ORGANISATIONS, { now: 'All' }),
  56: seenBy('Attendees carry your Wi-Fi login', ORGANISATIONS, { now: 'All' }),
}
// The row for one product, with the sentences it rests on. A product with no
// honest figure has no row.
const reachFor = (item) => {
  const r = REACH[item.id]?.(item)
  if (!r || r.figs.length === 0) return null
  return {
    ...r,
    estimate: r.basis.some((k) => REACH_ESTIMATES[k]),
    note: r.basis.map((k) => REACH_ESTIMATES[k] || REACH_FACTS[k]).filter(Boolean).join(' '),
  }
}
const ROOM_LEDE = 'A summit built on category fit, not badge count - the buyers, builders and rule-makers of prediction markets.'
const ROOM_PILLARS = [
  ['The Content', 'Three stages across two days: the Leadership Stage headline programme, plus two hub stages for deeper category conversations - regulation, liquidity, sports, data and the builder economy.'],
  ['The Network', 'Three NEXTworking evenings, curated introductions, private meeting rooms and hosted hospitality - built for a market that trades on relationships.'],
  ['The Reach', "Livestream, filmed sessions, official photography and the aftermovie extend your visibility well beyond the room, across NEXT's channels and your own."],
]
const RECOGNITION = [
  ['Silver', 'Below €30k', 'text-brand-gray', 'Silver position and logo recognition across agreed listings, website and onsite displays.'],
  ['Gold', '€30k – €79,999', 'text-yellow-400', 'Gold position and logo recognition across agreed listings, website and onsite displays.'],
  ['Platinum', '€80k – €134,999', 'text-blue-300', 'Platinum position and logo recognition across agreed listings, website and onsite displays.'],
  ['Diamond', '€135k+', 'text-cyan-100', 'Diamond position and logo recognition across agreed listings, website and onsite displays.'],
  ['Headline', 'Headline product', 'text-brand-yellow', 'The highest position in the partner hierarchy - reserved for the Headline Partner. Not reachable by spend alone.'],
]
const RECOGNITION_LEDE = 'Recognition is earned on your combined total spend across all NEXTPredict 2027 products. It carries no extra charge and adds no further products - it is how prominently the event says thank you.'
const RECOGNITION_NOTE = 'Levels are based on total NEXTPredict 2027 spend only. NEXT.io media spend and other NEXT.io events do not count towards recognition here.'
const REBOOKING_COPY = 'Partners from NEXTPredict 2026 qualify for a 15% rebooking rate on 2027 packages, with first conversation on the exclusive inventory they held. The rebooking rate is not combinable with any other offer.'

// ─── Cards: one card per decision ───────────────────────────────────────────
// Exclusive and shared routes over the same inventory are one decision, so each
// pair sits on one card as option tiles rather than as two cards a family
// apart. Every route stays its own product - price, deliverables, terms, status
// and calculator line - and every pair here is also a CONFLICT. The card title
// is the part of the two names the routes share; each tile carries the rest of
// its own name, verbatim ("Exclusive Partner", "Space Only").
const ROUTE_CARDS = [
  { title: 'Day 1 NEXTworking', ids: [2, 5] },
  { title: 'Day 2 NEXTworking', ids: [3, 6] },
  { title: 'Pre-Registration Event', ids: [4, 7] },
  { title: 'Stage 2 Partner', ids: [17, 18] },
  { title: 'Exhibition Stand 6x8, Gallery Showcase', ids: [31, 58] },
  { title: 'Exhibition Stand 8x4, Planner Area Showcase', ids: [32, 59] },
  { title: 'Exhibition Stand 6x4, Premium Gallery Position', ids: [33, 60] },
]
const byId = Object.fromEntries(pricing.map((p) => [p.id, p]))
// a renamed product that no longer starts with the card title keeps its full name on its tile
const routeLabel = (card, p) => (p.title.startsWith(card.title)
  ? p.title.slice(card.title.length).replace(/^,\s*/, '').replace(/^\s*\((.*)\)$/, '$1').trim()
  : p.title)

// families in rate-card order, each holding its cards in rate-card order
const CARDS = categories.map((cat) => {
  const cards = []
  const done = new Set()
  pricing.filter((p) => p.cat === cat).forEach((p) => {
    const route = ROUTE_CARDS.find((r) => r.ids.includes(p.id) && r.ids.every((id) => byId[id]?.cat === cat))
    if (!route) { cards.push({ key: String(p.id), title: p.title, cat, options: [p], featured: !!p.featured }); return }
    if (done.has(route.title)) return
    done.add(route.title)
    const options = route.ids.map((id) => byId[id])
    cards.push({ key: route.ids.join('-'), title: route.title, cat, options, featured: options.some((o) => o.featured) })
  })
  return { cat, cards }
})
const CARD_COUNT = CARDS.reduce((n, g) => n + g.cards.length, 0)

// ─── Where do I start? Four ways in ─────────────────────────────────────────
// Stuart, 29 Sep 2026: "if someone buying comes to this, I don't think they're
// going to know where to start, unless they know exactly that they want a
// speaking slot, or ... branding on site." The same four ways in sit above the
// menu on every summit card. Each maps to explicit product ids, never to a
// guess from the tags; a card belongs to a way when any of its routes does.
// A product can sit in two ways (the Headline speaks and brands; the curated
// invitations and introductions are both meetings and leads).
const WAYS = [
  { key: 'stage', title: 'Take the stage', line: 'Presentations, panels and sessions', icon: Mic,
    ids: [1, 11, 13, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28] },
  { key: 'seen', title: 'Be seen by everyone', line: 'Registration, badges, lanyards, screens, video, Wi-Fi', icon: Eye,
    ids: [1, 10, 14, 42, 43, 45, 46, 48, 49, 50, 51, 52, 53, 54, 55, 56] },
  { key: 'meet', title: 'Meet the right people', line: 'Evenings, C-level events, meeting rooms, introductions', icon: Handshake,
    ids: [2, 3, 4, 5, 6, 7, 8, 29, 30, 37, 38, 39, 40, 41, 44, 47] },
  { key: 'leads', title: 'Capture leads', line: 'Exhibition stands, invitations and introductions', icon: ScanLine,
    ids: [31, 58, 32, 59, 33, 60, 57, 34, 29, 30] },
]
const WAY = Object.fromEntries(WAYS.map((w) => [w.key, w]))

// A lens is what the menu, the cards' order of attention and a goal deck are
// looking through: a way in ({ kind: 'way', key }) or one of the rate card's
// own objective tags ({ kind: 'goal', value }, the goal chips). One at a time.
const lensLabel = (lens) => (!lens ? '' : lens.kind === 'way' ? WAY[lens.key].title : lens.value)
const lensHas = (lens, p) => (lens.kind === 'way' ? WAY[lens.key].ids.includes(p.id) : p.impact.includes(lens.value))
const cardHasLens = (card, lens) => card.options.some((o) => lensHas(lens, o))
const lensCount = (lens) => CARDS.reduce((n, g) => n + g.cards.filter((c) => cardHasLens(c, lens)).length, 0)
const sameLens = (a, b) => Boolean(a && b && a.kind === b.kind && (a.key || a.value) === (b.key || b.value))
// the entry price of a way: its lowest open, priced product
function wayFrom(way) {
  const prices = way.ids.map((id) => byId[id]).filter((p) => p && !isOut(p) && !p.poa).map((p) => p.price)
  return prices.length ? Math.min(...prices) : null
}

// ─── Family briefs ──────────────────────────────────────────────────────────
// At most two short sentences, and only where a family has to explain its
// value: everyone wants the stage, but branding, rooms and media sell on who
// sees them (Stuart, 29 Sep 2026). Each is built from the family's own lines;
// `room` adds a quiet link to the 2026 room.
const FAMILY_BRIEFS = {
  'NEXTworking Evening Events': { text: 'Three evenings with the whole market in one room. Own one outright, or share it: both routes sit on one card, and you book one or the other.' },
  'Exhibition': { text: 'A stand on the floor the room walks between sessions, with a badge scanner for the conversations you start there. Turnkey or space only, on one card.' },
  'Private Meeting Rooms': { text: 'A private branded room, yours for both event days: a door you can close for the meetings you came to have.', room: true },
  'Hospitality & Lounges': { text: 'The meeting and dining area, the Nourish Bars and the speakers’ lounge: where attendees return between sessions.', room: true },
  'Media & Content': { text: 'Your brand beyond the room: on the livestream, behind the interviews NEXT.io films, in its published videos and in front of the journalists covering the event.', room: true },
  'Venue Branding': { text: 'Branding every attendee sees, from the registration page to the last session: registration, badges, lanyards, the stairs, the cloakroom, the restrooms, the event guide and the Wi-Fi.', room: true },
}

// ─── The picture at the top of every card ───────────────────────────────────
// Stuart has no NEXTPredict photography yet (the 2026 summit runs 22-23
// October 2026), so a card shows, in this order: NEXT's own New York 2026
// event photography, labelled "NEXT events, New York, 2026", or Convene's own
// imagery of 30 Hudson Yards, labelled as the 2026 venue (never the 2027
// venue, which is still to be announced). No photograph repeats across cards.
// A product with no honest photograph gets a designed header instead (`art`),
// marked as an illustration. Keyed by the card's first product id. Photos with
// legible gambling-brand messaging, a readable attendee name or a speaker
// line-up on screen were left out or cropped, and the 2026 stage and hub
// partners' logos on the stage walls were softened out of the rest, so no
// 2026 sponsor reads as a NEXTPredict partner (see CLAUDE.md, 29 Sep 2026).
const PHOTO_CREDIT = { ny: 'NEXT events, New York, 2026', venue: 'Convene, 30 Hudson Yards, the 2026 venue' }
const NY_EVENT = 'at a NEXT event in New York, 2026'
const AT_VENUE = 'at Convene, 30 Hudson Yards, the 2026 venue'
const CARD_VISUAL = {
  1: { photo: 'main-hall-side', credit: 'ny', wide: true, pos: '45% 50%', alt: `A full main hall following a panel on stage ${NY_EVENT}` },
  2: { photo: 'nw-packed', credit: 'ny', wide: true, alt: `A packed evening networking event ${NY_EVENT}` },
  3: { photo: 'nw-bar', credit: 'ny', alt: `Guests around the bar at an evening event ${NY_EVENT}` },
  4: { photo: 'nw-smiles', credit: 'ny', alt: `Delegates talking over drinks at an evening reception ${NY_EVENT}` },
  8: { photo: 'vip', credit: 'ny', alt: `Senior guests in conversation at an evening gathering ${NY_EVENT}` },
  10: { photo: 'main-hall-stage', credit: 'ny', wide: true, pos: '52% 50%', alt: `The main stage and its audience ${NY_EVENT}` },
  11: { photo: 'leadership-speaker', credit: 'ny', pos: '50% 18%', alt: `A speaker presenting on the Leadership Stage ${NY_EVENT}` },
  13: { photo: 'panel-five', credit: 'ny', pos: '50% 42%', alt: `Panellists and a moderator on the main stage ${NY_EVENT}` },
  14: { photo: 'venue-theatre', credit: 'venue', alt: `Rows of seats set theatre style in a hall ${AT_VENUE}` },
  15: { photo: 'main-panel-4', credit: 'ny', pos: '50% 45%', alt: `A panellist speaking on the main stage ${NY_EVENT}` },
  16: { photo: 'main-panel-wide', credit: 'ny', alt: `A five-person panel on the main stage ${NY_EVENT}` },
  17: { photo: 'hub-room', credit: 'ny', alt: `A hub stage room set for a session ${NY_EVENT}` },
  19: { photo: 'solo-presenter', credit: 'ny', pos: '50% 30%', alt: `A presenter delivering a keynote ${NY_EVENT}` },
  20: { photo: 'hub-mic', credit: 'ny', alt: `Panellists with microphones in a hub session ${NY_EVENT}` },
  21: { photo: 'hub-mic-2', credit: 'ny', alt: `A panellist speaking into a microphone in a hub session ${NY_EVENT}` },
  22: { photo: 'hub-stage', credit: 'ny', alt: `A panel on a hub stage in front of a full room ${NY_EVENT}` },
  24: { photo: 'venue-hub', credit: 'venue', alt: `A hub room set for a session ${AT_VENUE}` },
  25: { photo: 'crowd', credit: 'ny', alt: `A seated audience following a session ${NY_EVENT}` },
  26: { photo: 'audience-smile', credit: 'ny', alt: `Audience members during a session ${NY_EVENT}` },
  27: { photo: 'audience-red', credit: 'ny', alt: `An audience watching a session ${NY_EVENT}` },
  28: { photo: 'venue-hall', credit: 'venue', alt: `A conference hall set for sessions ${AT_VENUE}` },
  29: { photo: 'venue-studio', credit: 'venue', alt: `A studio set with round tables for a workshop ${AT_VENUE}` },
  30: { photo: 'intros', credit: 'ny', pos: '50% 40%', alt: `Two delegates shaking hands on a sofa ${NY_EVENT}` },
  31: { art: 'stand', size: [6, 8] },
  32: { art: 'stand', size: [8, 4] },
  33: { art: 'stand', size: [6, 4] },
  57: { art: 'stand', size: [6, 2] },
  34: { art: 'stand', size: [3, 2] },
  37: { photo: 'venue-boardroom', credit: 'venue', alt: `A boardroom with a long table ${AT_VENUE}` },
  38: { photo: 'venue-boardroom-long', credit: 'venue', alt: `A boardroom set for a meeting ${AT_VENUE}` },
  39: { photo: 'venue-boardroom-round', credit: 'venue', alt: `A meeting room with a round table ${AT_VENUE}` },
  40: { photo: 'venue-boardroom-four', credit: 'venue', alt: `A small meeting room with a round table by the window ${AT_VENUE}` },
  41: { photo: 'table-talk', credit: 'ny', alt: `Three guests in conversation at a table ${NY_EVENT}` },
  42: { photo: 'venue-gallery', credit: 'venue', alt: `The gallery, with seating and a refreshment counter, ${AT_VENUE}` },
  43: { art: 'cup' },
  44: { photo: 'venue-lounge', credit: 'venue', alt: `Lounge seating by the windows ${AT_VENUE}` },
  45: { art: 'live' },
  46: { photo: 'media-camera', credit: 'ny', pos: '50% 40%', alt: `A member of the NEXT.io media team with a camera ${NY_EVENT}` },
  47: { photo: 'venue-library', credit: 'venue', alt: `An event room with high tables and screens ${AT_VENUE}` },
  48: { photo: 'venue-walkway', credit: 'venue', alt: `A large video wall in the walkway ${AT_VENUE}` },
  49: { photo: 'venue-entrance', credit: 'venue', alt: `The entrance and reception desk ${AT_VENUE}` },
  50: { art: 'hanger' },
  51: { photo: 'venue-welcome', credit: 'venue', alt: `The welcome desk with the stairs behind it ${AT_VENUE}` },
  52: { art: 'badge' },
  53: { art: 'lanyard' },
  54: { art: 'restroom' },
  55: { art: 'guide' },
  56: { art: 'wifi' },
}
const visualOf = (card) => CARD_VISUAL[card.options[0].id] || null

// ─── Lead data: one rule on total spend, switched off ───────────────────────
// Stuart, 29 Sep 2026: the opted-in selection follows the partner's TOTAL
// spend (the plan total the recognition level reads), never one product's
// price: from €30,000 up to 50 opted-in contacts, from €60,000 up to 100, from
// €100,000 up to 150. Stands keep their own booth scans; networking evenings
// share a selection of opted-in guests; below €30,000 nothing (NEXTPredict
// sells no lead add-on); never the full attendee list (Pierre: NEXT keeps
// control of its data). OFF until Pierre confirms the numbers in writing:
// while `on` is false nothing shows on the page, the deck or either PDF.
// Switched on, the rule line opens the rate card and the rate-card PDF, a plan
// that reaches a tier says so in the selection, the ROI calculator, the plan
// slide and the proposal, and the stand and evening cards carry their own
// line. No card shows a contact number.
const LEAD_DATA = {
  on: false,
  tiers: [[100000, 150], [60000, 100], [30000, 50]], // [minimum total spend in EUR, up to N opted-in contacts], highest first
  exhibitors: 'Your own booth scans',
  networking: 'A selection of opted-in guests',
}
const leadDataLive = () => LEAD_DATA.on && LEAD_DATA.tiers.length > 0
// the one rule line
function leadDataRule() {
  if (!leadDataLive()) return null
  const steps = [...LEAD_DATA.tiers].reverse().map(([min, n], k) => `up to ${n}${k ? '' : ' opted-in contacts'} from ${fmtPrice(min)}`)
  const list = steps.length > 1 ? `${steps.slice(0, -1).join(', ')} and ${steps[steps.length - 1]}` : steps[0]
  return `Lead data follows your total spend: ${list}, never the full attendee list. Stands keep their own booth scans, and networking evenings share a selection of opted-in guests.`
}
// the plan's own line, once its total reaches a tier
function planLeadLine(total) {
  if (!leadDataLive()) return null
  const tier = LEAD_DATA.tiers.find(([min]) => total >= min)
  return tier ? `Your plan includes up to ${tier[1]} opted-in contacts` : null
}
// a card's own line: only the stands and the evenings carry one
function leadDataLine(item) {
  if (!leadDataLive()) return null
  if (item.cat === 'Exhibition') return LEAD_DATA.exhibitors
  if (item.cat === 'NEXTworking Evening Events') return LEAD_DATA.networking
  return null
}
// the plan line as the page sets it: under the level, with the scan mark
function PlanLeadLine({ total, className = '' }) {
  const line = planLeadLine(total)
  if (!line) return null
  return (
    <p className={`flex items-start gap-2 text-sm font-semibold text-brand-white/90 ${className}`}>
      <ScanLine className="mt-0.5 h-4 w-4 shrink-0 text-brand-yellow" aria-hidden /> <span>{line}</span>
    </p>
  )
}

// ─── Anchors ────────────────────────────────────────────────────────────────
// Every card is `p-<slug of its title>`; a two-route card also carries an
// anchor per route, `p-<slug of that product's full title>`, which opens the
// card on that route. Families are the slug of the family name, tickets
// `t-<slug>`. `.jump-target` / `.jump-section` (index.css) offset every landing
// by the measured nav (and family bar) height.
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const productId = (x) => `p-${slugify(x.title)}`
const catId = (cat) => slugify(cat)
const ticketId = (t) => `t-${slugify(t.type)}`

const FAMILY_META = {
  'Category Ownership': { short: 'Category Ownership', icon: Crown },
  'NEXTworking Evening Events': { short: 'NEXTworking', icon: Martini },
  'Leadership Stage': { short: 'Leadership Stage', icon: Mic },
  // Projector, not Presentation: the Presentation icon is the Present action
  'Stage 2 Hub': { short: 'Stage 2', icon: Projector },
  'Stage 3 Hub': { short: 'Stage 3', icon: MonitorPlay },
  'Workshops & Curated Networking': { short: 'Workshops', icon: Handshake },
  'Exhibition': { short: 'Exhibition', icon: Store },
  'Private Meeting Rooms': { short: 'Meeting Rooms', icon: DoorClosed },
  'Hospitality & Lounges': { short: 'Hospitality', icon: Coffee },
  'Media & Content': { short: 'Media', icon: Video },
  'Venue Branding': { short: 'Venue Branding', icon: Flag },
}

const isOut = (p) => p.status === 'sold' || p.status === 'reserved'
const availLabel = (p) => (p.status === 'sold' ? 'Sold Out' : p.status === 'reserved' ? 'Reserved'
  : p.exclusive ? 'Exclusive' : p.avail ? `${p.avail} Available` : null)
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// The entry price a menu line quotes: the lowest open route ("from" when the
// routes differ), POA, or Sold / Reserved once nothing on the card is open.
function menuPrice(card) {
  const open = card.options.filter((o) => !isOut(o))
  if (!open.length) return { text: card.options.some((o) => o.status === 'reserved') ? 'Reserved' : 'Sold', out: true }
  const priced = open.filter((o) => !o.poa)
  if (!priced.length) return { text: 'POA' }
  const low = Math.min(...priced.map((o) => o.price))
  return { from: new Set(priced.map((o) => o.price)).size > 1, text: fmtPrice(low) }
}
function familyFrom(cards) {
  const prices = cards.flatMap((c) => c.options.filter((o) => !isOut(o) && !o.poa).map((o) => o.price))
  if (!prices.length) return null
  return `${new Set(prices).size > 1 ? 'from ' : ''}${fmtPrice(Math.min(...prices))}`
}

// Balanced spans: two up from md, three up from xl (six tracks). A last row of
// two splits the width and a last row of one takes all of it - the card then
// lays itself out wide by container query - so no grid ends on an empty cell.
function spanClass(i, n) {
  let xl = 'xl:col-span-2'
  if (n % 3 === 2 && i >= n - 2) xl = 'xl:col-span-3'
  if (n % 3 === 1 && i === n - 1) xl = 'xl:col-span-6'
  const md = n % 2 === 1 && i === n - 1 ? 'md:col-span-2' : 'md:col-span-1'
  return `${md} ${xl}`
}
// spans for a family: featured cards take the full row; each run of regular
// cards between them is balanced on its own
function familySpans(cards) {
  const spans = []
  let i = 0
  while (i < cards.length) {
    if (cards[i].featured) { spans.push(''); i++; continue }
    let j = i
    while (j < cards.length && !cards[j].featured) j++
    for (let k = i; k < j; k++) spans.push(spanClass(k - i, j - i))
    i = j
  }
  return spans
}

// ─── Tier Progress bar ──────────────────────────────────────────────────────
function TierProgress({ total, cart }) {
  const current = resolveTier(total, cart)
  const next = nextSpendTier(total, cart)
  const pct = next ? Math.min(((total - current.min) / (next.min - current.min)) * 100, 100) : 100
  const toNext = next ? next.min - total : 0
  return (
    <div className="px-4 sm:px-6 pt-2 pb-1">
      <div className="flex items-center justify-between text-[11px] mb-1.5 gap-2">
        <div className="flex items-center gap-1.5">
          <span className={`font-black uppercase ${current.color}`}>{current.name}</span>
          {next && <span className="text-brand-gray/60">→</span>}
          {next && <span className="font-semibold text-brand-gray/80">{next.name}</span>}
        </div>
        <span className="text-brand-gray/70 shrink-0">
          {next
            ? <>€{toNext.toLocaleString('en-US')} to reach <span className={`font-bold ${next.color}`}>{next.name}</span></>
            : <span className="text-brand-yellow font-bold">{current.name} level reached ✦</span>}
        </span>
      </div>
      <div className="h-1.5 bg-brand-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-brand-yellow rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Deliverables and terms ─────────────────────────────────────────────────
// A bullet string carries two kinds of line. Plain lines are what the partner
// gets; they collapse after `collapsedCount`. Lines opening 📅 (availability)
// or ⚠️ (a condition) are terms: they never collapse and sit together under
// their own quiet heading, word for word - a buyer should not have to expand a
// list to find a rule, and a rule should not shout like a warning either.
function splitBullets(bullets) {
  const items = []
  const terms = []
  bullets.split('\n').map((l) => l.trim()).filter(Boolean).forEach((line) => {
    if (line.startsWith('📅')) terms.push({ kind: 'avail', text: line.slice(2).trim() })
    else if (line.startsWith('⚠️')) terms.push({ kind: 'cond', text: line.slice(2).trim() })
    else items.push(line)
  })
  return { items, terms }
}

// `bare`: the list alone, for the card's "Availability & terms" accordion,
// which carries the heading itself.
function TermsList({ terms, bare = false }) {
  if (!terms.length) return null
  const list = (
    <ul className="space-y-2">
      {terms.map((t, i) => {
        const Icon = t.kind === 'avail' ? CalendarDays : Info
        return (
          <li key={i} className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-brand-gray">
            <Icon className={`w-3.5 h-3.5 shrink-0 mt-[3px] ${t.kind === 'avail' ? 'text-brand-yellow/75' : 'text-brand-gray/70'}`} aria-hidden />
            <span>{t.text}</span>
          </li>
        )
      })}
    </ul>
  )
  if (bare) return list
  return (
    <div className="mt-5 pt-4 border-t border-brand-white/10">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-gray mb-2.5">Availability &amp; terms</p>
      {list}
    </div>
  )
}

// ─── What's included · N, Availability & terms · N ──────────────────────────
// Stuart, 29 Sep 2026: "There's just a lot to read". The card leads with the
// value and the price; the lines sit one tap away in two accordions, each with
// its count. Every line is still in the page (a closed <details> keeps its
// content), in both PDFs and in full on the product's Present slide: the 26 Sep
// rule ("Please do include all deliverables") still holds, nothing is trimmed.
function Accordion({ title, count, children }) {
  return (
    <details className="group/acc border-t border-brand-white/10 first:border-t-0">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 py-2 text-left [&::-webkit-details-marker]:hidden">
        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-brand-white/90">{title}</span>
        <span className="text-[11px] font-bold tabular-nums text-brand-gray" aria-label={`, ${count} ${count === 1 ? 'line' : 'lines'}`}>&middot; {count}</span>
        <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-brand-gray transition-transform duration-200 group-open/acc:rotate-180" aria-hidden />
      </summary>
      <div className="pb-4 pt-1">{children}</div>
    </details>
  )
}
function CardDetails({ items, terms }) {
  return (
    <div className="rounded-xl border border-brand-white/10 bg-brand-white/[0.02] px-4">
      <Accordion title={'What’s included'} count={items.length}>
        <ul className="space-y-2">
          {items.map((line, i) => (
            <li key={i} className="flex items-start text-sm text-brand-white/85">
              <CircleCheck className="text-brand-yellow mr-3 shrink-0 mt-0.5 w-4 h-4" aria-hidden />
              <span className="leading-relaxed">{line}</span>
            </li>
          ))}
        </ul>
      </Accordion>
      {terms.length > 0 && (
        <Accordion title={'Availability & terms'} count={terms.length}>
          <TermsList terms={terms} bare />
        </Accordion>
      )}
    </div>
  )
}

// ─── Card pieces ────────────────────────────────────────────────────────────
// Route tiles: a radio group (arrow keys move the choice, Tab leaves it). Each
// tile shows its route, its price and its availability, so the buyer reads both
// routes before choosing, not after.
function OptionTiles({ card, sel, setSel, rebooking }) {
  const opts = card.options
  const pick = (e, j) => {
    e.preventDefault()
    setSel(opts[j].id)
    e.currentTarget.querySelectorAll('[role="radio"]')[j]?.focus()
  }
  const onKey = (e) => {
    const i = opts.findIndex((o) => o.id === sel)
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') pick(e, (i + 1) % opts.length)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') pick(e, (i - 1 + opts.length) % opts.length)
    else if (e.key === 'Home') pick(e, 0)
    else if (e.key === 'End') pick(e, opts.length - 1)
  }
  return (
    <div role="radiogroup" aria-label={`${card.title}: choose a route`} onKeyDown={onKey}
      className="grid grid-cols-2 gap-2 mb-5">
      {opts.map((o) => {
        const on = o.id === sel
        const a = availLabel(o)
        const shown = o.status === 'sold' ? 'Sold' : o.status === 'reserved' ? 'Reserved'
          : o.poa ? 'POA' : fmtPrice(rebooking ? Math.round(o.price * 0.85) : o.price)
        return (
          <button key={o.id} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} data-title={o.title}
            onClick={() => setSel(o.id)}
            className={`flex flex-col items-start justify-between gap-2 rounded-xl border px-3.5 py-3 min-h-[4.75rem] text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow ${on
              ? 'border-brand-yellow bg-brand-yellow/[0.12] shadow-[inset_0_0_0_1px_#ffcf33]'
              : 'border-brand-white/12 bg-brand-white/[0.03] hover:border-brand-white/30 hover:bg-brand-white/[0.07]'}`}>
            <span className={`text-[10.5px] font-black uppercase tracking-[0.1em] leading-tight ${on ? 'text-brand-yellow' : 'text-brand-white/80'}`}>{routeLabel(card, o)}</span>
            <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className={`text-[15px] font-black tabular-nums leading-none whitespace-nowrap ${on ? 'text-brand-white' : 'text-brand-gray'}`}>{shown}</span>
              {!o.exclusive && o.avail && !isOut(o) && <span className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-brand-gray/80 whitespace-nowrap">{a}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// `scale` sizes the same block for Present mode: 'slide' (a product slide) or
// 'route' (one of two route panels).
const PRICE_SCALE = { slide: 'text-5xl sm:text-6xl', route: 'text-4xl' }
function PriceBlock({ item, rebooking, featured, scale }) {
  const size = PRICE_SCALE[scale] || (featured ? 'text-4xl md:text-5xl' : 'text-[1.75rem] leading-none')
  const big = featured || Boolean(scale)
  if (item.poa) return <p className={`${size} font-black text-brand-yellow mb-5 leading-none`}>POA</p>
  if (rebooking) return (
    <div className="mb-5">
      <p className={`${big ? 'text-xl' : 'text-sm'} text-brand-gray/50 line-through tabular-nums`}>{fmtPrice(item.price)}</p>
      <p className={`${size} font-black text-brand-yellow leading-none tabular-nums`}>{fmtPrice(Math.round(item.price * 0.85))}</p>
      <p className="text-[11px] text-brand-yellow/70 font-semibold mt-1.5 uppercase tracking-wide">15% rebooking rate applied</p>
    </div>
  )
  return <p className={`${size} font-black text-brand-yellow mb-5 leading-none tabular-nums`}>{fmtPrice(item.price)}</p>
}

// The product lede - the pitch in one breath. It is set plain, in the reading
// colour, with the yellow rule as its only accent: in quote marks and italics
// it read like a testimonial nobody gave.
const stripQuotes = (s) => s.replace(/^["“]\s*/, '').replace(/\s*["”]$/, '')
function Lede({ text, featured, scale }) {
  const size = scale === 'slide' ? 'text-lg sm:text-xl mb-6' : featured ? 'text-[15px] mb-6' : 'text-[13.5px] mb-5'
  return (
    <p className={`border-l-2 border-brand-yellow/60 pl-4 leading-relaxed text-brand-white/75 ${size}`}>
      {stripQuotes(text)}
    </p>
  )
}

function CornerBadge({ item, featured }) {
  const label = availLabel(item)
  const pos = 'absolute top-0 right-0 z-20 text-[10px] font-black uppercase tracking-widest rounded-bl-xl'
  if (featured && !isOut(item)) return <div className={`${pos} bg-brand-yellow text-brand-dark px-5 py-2 shadow-md`}>✦ {label || 'Featured'}</div>
  if (!label) return null
  // over a photograph: a dark, blurred backing so the badge reads on any picture
  const tone = item.status === 'sold' ? 'bg-brand-dark/90 text-brand-white'
    : item.status === 'reserved' ? 'bg-brand-dark/90 text-brand-yellow'
      : 'bg-brand-dark/85 text-brand-white/85'
  return <div className={`${pos} px-4 py-1.5 backdrop-blur-sm ${tone}`}>{label}</div>
}

function TagRow({ item, featured, className = '' }) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {item.impact.map((t) => (
        <span key={t} className={`px-2 py-1 rounded-md font-medium uppercase tracking-wider ${featured ? 'bg-brand-white/10 text-brand-white text-[10px]' : 'bg-brand-white/[0.07] text-brand-gray text-[9.5px]'}`}>{t}</span>
      ))}
      {featured && item.type.map((t) => (
        <span key={t} className="px-2 py-1 bg-brand-yellow/20 text-brand-yellow text-[10px] uppercase tracking-wider rounded-md font-medium">{t}</span>
      ))}
    </div>
  )
}

function cardCtaLabel(item, { atLimit, conflicted }) {
  if (item.status === 'sold') return 'Sold Out'
  if (item.status === 'reserved') return 'Reserved'
  if (conflicted) return 'Unavailable With Selection'
  if (atLimit) return item.exclusive ? 'Added' : `All ${item.avail} Added`
  return 'Add to Calculator'
}

function AddButton({ item, count, conflicted, onAdd, featured }) {
  const max = item.exclusive ? 1 : (item.avail ?? Infinity)
  const atLimit = count >= max || isOut(item) || conflicted
  return (
    <button type="button" onClick={() => onAdd(item)} disabled={atLimit}
      className={`w-full rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 ${featured ? 'py-4 text-sm' : 'py-3.5 text-xs'} ${atLimit
        ? (featured ? 'bg-brand-yellow/25 text-brand-yellow cursor-not-allowed' : 'bg-brand-white/10 text-brand-gray cursor-not-allowed')
        : (featured ? 'bg-brand-yellow text-brand-dark hover:brightness-110 shadow-[0_0_20px_rgba(255,207,51,0.3)]' : 'bg-brand-yellow/15 text-brand-yellow border border-brand-yellow/40 hover:bg-brand-yellow hover:text-brand-dark')}`}>
      <Calculator className="w-4 h-4" aria-hidden />
      {cardCtaLabel(item, { atLimit, conflicted })}
    </button>
  )
}

// ─── Product card ───────────────────────────────────────────────────────────
// The summit through line (29 Sep 2026), identical on every summit card: a
// picture at the top, the name and one-line lede, the value row (ReachRow)
// straight under the lede, the price with its availability and status, Add to
// Calculator, then quiet Present and Copy link, and the lines in two
// accordions ("What's included · N", "Availability & terms · N"). `featured`
// is the gold full-row treatment; a card as wide as a full row (featured, or
// alone on its row, see `spanClass`) lays itself out by container query
// (`@2xl`): the picture becomes its left column, the offer the right.
function ProductCard({ card, span = '', rebooking, cartCounts, conflictedIds, onAdd, onPresent }) {
  const featured = card.featured
  const multi = card.options.length > 1
  // opens on the first route still open; a deep link to a route overrides it
  const [sel, setSel] = useState(() => (card.options.find((o) => !isOut(o)) || card.options[0]).id)
  // a deep link to one route (#p-<full product title>) opens the card on it
  useEffect(() => {
    if (!multi) return
    const fromHash = () => {
      const h = decodeURIComponent(window.location.hash.slice(1))
      const hit = card.options.find((o) => productId(o) === h)
      if (hit) setSel(hit.id)
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [card, multi])
  const item = card.options.find((o) => o.id === sel) || card.options[0]
  const count = cartCounts[item.id] || 0
  const conflicted = conflictedIds.has(item.id)
  const allSold = card.options.every((o) => o.status === 'sold')
  const { items, terms } = splitBullets(item.bullets)
  const shell = featured
    ? `col-span-full border-brand-yellow/40 bg-gradient-to-br from-brand-yellow/[0.14] via-brand-dark/95 to-brand-dark shadow-[0_0_60px_rgba(255,207,51,0.08)] hover:border-brand-yellow/70 hover:shadow-[0_0_80px_rgba(255,207,51,0.16)] ${allSold ? 'opacity-60' : ''}`
    : `${span} bg-brand-white/[0.04] ${allSold ? 'border-brand-white/5 opacity-60' : 'border-brand-white/10 hover:border-brand-yellow/40 hover:bg-brand-white/[0.06]'}`
  return (
    <article id={productId(card)} aria-labelledby={`${productId(card)}-title`}
      className={`jump-target clip-box @container relative rounded-2xl border transition-colors duration-300 ${shell}`}>
      {multi && card.options.map((o) => <span key={o.id} id={productId(o)} className="jump-target absolute top-0 left-0" aria-hidden="true" />)}
      <CornerBadge item={item} featured={featured} />
      <div className="flex h-full flex-col @2xl:flex-row">
      <CardVisual card={card} />
      <div className={`relative z-10 flex-1 min-w-0 flex flex-col ${featured
        ? 'px-6 sm:px-8 md:px-10 pt-6 sm:pt-7 @2xl:pt-9 pb-6 sm:pb-8 md:pb-9'
        : 'px-5 sm:px-6 @2xl:px-8 pt-5 sm:pt-6 @2xl:pt-8 pb-5 sm:pb-6 @2xl:pb-7'}`}>
        <div className="flex flex-col">
          <h4 id={`${productId(card)}-title`}
            className={`font-black text-brand-white leading-tight ${featured ? 'text-[1.75rem] sm:text-3xl md:text-4xl mb-4 @2xl:pr-4' : 'text-xl @2xl:text-2xl mb-3'}`}>
            {card.title}
          </h4>
          <Lede text={item.quote} featured={featured} />
          <ReachRow item={item} className="mb-5" />
          {multi && <OptionTiles card={card} sel={item.id} setSel={setSel} rebooking={rebooking} />}
          <PriceBlock item={item} rebooking={rebooking} featured={featured} />
          <LeadDataBadge item={item} className="-mt-2 mb-4" />
          <AddButton item={item} count={count} conflicted={conflicted} onAdd={onAdd} featured={featured} />
          {/* quiet, under the button: Present opens the deck on this product,
              Copy link copies this card's address (a route card: the route
              on screen, which reopens the card on it) */}
          <div className="mt-2 flex flex-wrap items-center justify-end gap-x-1">
            <button type="button" onClick={() => onPresent(productId(item))} title="Present this product full screen"
              className={`${CARD_QUIET} ${CARD_QUIET_TONE}`}>
              <Presentation className="w-3.5 h-3.5 shrink-0" aria-hidden /> Present
            </button>
            <CopyLinkButton id={productId(item)} look={CARD_QUIET} className={CARD_QUIET_TONE} />
          </div>
        </div>
        <div className="mt-4">
          <CardDetails key={item.id} items={items} terms={terms} />
        </div>
      </div>
      </div>
    </article>
  )
}
const CARD_QUIET = 'inline-flex items-center gap-1.5 min-h-10 sm:min-h-9 rounded-full px-3 text-xs font-bold'
const CARD_QUIET_TONE = 'text-brand-gray hover:text-brand-yellow hover:bg-brand-white/[0.06] transition-colors'

// The lead-data line under the price. Silent while LEAD_DATA is off.
function LeadDataBadge({ item, className = '' }) {
  const line = leadDataLine(item)
  if (!line) return null
  return (
    <p className={`inline-flex items-center gap-2 self-start rounded-full border border-brand-white/15 bg-brand-white/[0.04] px-3 py-1.5 text-[11.5px] font-bold text-brand-white/85 ${className}`}>
      <ScanLine className="h-3.5 w-3.5 shrink-0 text-brand-yellow" aria-hidden /> Lead data: {line}
    </p>
  )
}

// ─── The card's picture ─────────────────────────────────────────────────────
// A photograph with its credit line, or a designed header marked as an
// illustration. 16:9 at the top of a card; the left column once the card is
// wide (container query), so a wide card never ends in an empty half. The
// slow Ken Burns runs only while the picture is on screen (`data-inview`,
// set by useInView in App) and never under reduced motion.
const VISUAL_BOX = 'card-visual relative shrink-0 aspect-[16/9] @2xl:aspect-auto @2xl:w-5/12 @2xl:min-h-[22rem] overflow-hidden border-b @2xl:border-b-0 @2xl:border-r border-brand-white/10 bg-[#1c1c1e]'
function CardVisual({ card }) {
  const v = visualOf(card)
  if (!v) return null
  if (v.art) {
    return (
      <div className={VISUAL_BOX}>
        <CardArt v={v} />
        <span className="absolute left-3 right-3 bottom-2 text-[9.5px] font-bold uppercase leading-snug tracking-[0.16em] text-brand-gray/75">{v.art === 'stand' ? 'Illustration · every stand to one scale' : 'Illustration'}</span>
      </div>
    )
  }
  const src = `${base}images/cards/${v.photo}.webp`
  return (
    <figure className={VISUAL_BOX}>
      <img src={src} srcSet={v.wide ? `${src} 960w, ${base}images/cards/${v.photo}-wide.webp 1600w` : undefined}
        sizes={v.wide ? '(min-width: 1280px) 1216px, 100vw' : undefined}
        alt={v.alt} loading="lazy" decoding="async"
        className="kenburns absolute inset-0 h-full w-full object-cover" style={v.pos ? { objectPosition: v.pos } : undefined} />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/65 to-transparent" />
      <figcaption className="absolute left-3 right-24 bottom-2 truncate text-[10px] font-semibold text-brand-white/85 [text-shadow:0_1px_6px_rgba(0,0,0,0.85)]">{PHOTO_CREDIT[v.credit]}</figcaption>
    </figure>
  )
}

// Designed headers, in the hero's own language: the chart grid, a probability
// line and one glyph, with a line taken from the product's own deliverables.
// Stands are drawn to one scale, so the five footprints compare at a glance.
const ART = {
  cup: { icon: Coffee, eyebrow: 'Nourish Bar', line: 'One of the three bars, and its credenzas' },
  live: { icon: Radio, eyebrow: 'Livestream', line: 'Your logo on the event livestream' },
  hanger: { icon: Shirt, eyebrow: 'Cloakroom', line: 'Counter, branding and an LCD screen' },
  badge: { icon: Contact, eyebrow: 'Badges', line: 'Your logo on all delegate badges' },
  lanyard: { icon: IdCard, eyebrow: 'Lanyards', line: 'Two designs, each around half the room' },
  restroom: { icon: Droplets, eyebrow: 'Restrooms', line: 'Every restroom, one brand' },
  guide: { icon: QrCode, eyebrow: 'Digital event guide', line: 'Your logo and QR code on every badge' },
  wifi: { icon: Wifi, eyebrow: 'Wi-Fi', line: 'Your network name and password' },
}
const ART_LINE = probabilityLine(11)
function ArtBackdrop() {
  return (
    <svg viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden className="absolute inset-0 h-full w-full">
      <path d={ART_LINE.area} fill="#ffcf33" fillOpacity="0.05" />
      <polyline points={ART_LINE.line} fill="none" stroke="#ffcf33" strokeOpacity="0.35" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  )
}
function CardArt({ v }) {
  if (v.art === 'stand') return <StandArt size={v.size} />
  const a = ART[v.art]
  const Icon = a.icon
  return (
    <div className="absolute inset-0">
      <div aria-hidden className="terminal-grid absolute inset-0" />
      <ArtBackdrop />
      <div className="absolute inset-0 flex items-center gap-4 sm:gap-5 px-6 sm:px-8">
        <span className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl border border-brand-yellow/40 bg-brand-dark/70 text-brand-yellow shadow-[0_0_30px_rgba(255,207,51,0.18)]">
          <Icon className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-yellow">{a.eyebrow}</p>
          <p className="mt-1.5 text-base sm:text-lg font-black leading-snug text-brand-white text-balance">{a.line}</p>
        </div>
      </div>
    </div>
  )
}
// A stand's footprint on a dot grid at one fixed scale (18px to one unit of
// the size in its name, long side across), whatever the shape of the box, so the five footprints compare
// at a glance on the phone card, the two-up card and the wide card alike. The
// grid is a CSS background centred on the box; an odd side shifts it half a
// unit so the footprint's edges sit on the dots.
const STAND_UNIT = 18
function StandArt({ size: [a, b] }) {
  const w = Math.max(a, b)
  const d = Math.min(a, b)
  const half = STAND_UNIT / 2
  return (
    <div aria-hidden className="stand-grid absolute inset-0 flex items-center justify-center"
      style={{ backgroundSize: `${STAND_UNIT}px ${STAND_UNIT}px`, backgroundPosition: `calc(50% + ${w % 2 ? half : 0}px) calc(50% + ${d % 2 ? half : 0}px)` }}>
      <div className="flex items-center justify-center rounded-[3px] border-[1.5px] border-brand-yellow bg-brand-yellow/[0.14] shadow-[0_0_28px_rgba(255,207,51,0.16)] text-[20px] font-black text-brand-yellow"
        style={{ width: w * STAND_UNIT, height: d * STAND_UNIT }}>{`${a}x${b}`}</div>
    </div>
  )
}

// ─── Section heading ────────────────────────────────────────────────────────
// Every section opens the same way: a centred uppercase heading, white with a
// yellow accent, and a grey lede under it.
function SectionHead({ title, accent, sub, lede, children }) {
  return (
    <div className="text-center mb-12 md:mb-14" data-anim style={anim}>
      <h2 className="text-[2rem] leading-[1.05] sm:text-4xl md:text-5xl font-black text-brand-white uppercase tracking-tight">
        {title}{accent && <> <span className="text-brand-yellow whitespace-nowrap">{accent}</span></>}
      </h2>
      {sub && <h3 className="text-lg sm:text-2xl md:text-3xl font-bold text-brand-yellow uppercase mt-3 leading-tight">{sub}</h3>}
      {lede && <p className="text-brand-gray text-base md:text-lg max-w-3xl mx-auto mt-5 leading-relaxed text-pretty">{lede}</p>}
      {children}
    </div>
  )
}

// ─── Navigation: the ways in, the product menu and the family bar ──────────
// Stuart, 23 Sep 2026: "it's hard to find products when i have to scroll right
// down for them", and 29 Sep 2026: "it's really hard to know what I should
// select". The page opens on four ways in, then the rate card at a glance:
// every family as a tile (picture, name, product count, "from" price) that
// opens its product list, each line a link to its card; among the cards a slim
// bar keeps every family one tap away. Clicks go through `onJump`, which
// brings back a card an objective or format filter has hidden before it
// scrolls.
// `mark`: undefined while no lens is on, then 'on' (the line matches the lens:
// highlighted) or 'off' (dimmed, still listed, still a link).
function MenuLine({ href, onClick, title, price, mark }) {
  return (
    <li className={`transition-opacity duration-200 ${mark === 'off' ? 'opacity-35' : ''}`}>
      <a href={href} onClick={onClick}
        className="group/row flex items-end gap-2 px-4 min-h-11 py-2.5 text-[13.5px] leading-snug">
        <span className={`${mark === 'on' ? 'text-brand-yellow font-semibold' : 'text-brand-white/85'} group-hover/row:text-brand-yellow transition-colors`}>{title}</span>
        <span className="flex-1 min-w-4 mb-[5px] border-b border-dotted border-brand-white/20 group-hover/row:border-brand-yellow/50 transition-colors" aria-hidden />
        <span className={`shrink-0 whitespace-nowrap tabular-nums ${price.out ? 'text-[12px] font-bold uppercase tracking-wider text-brand-gray' : 'font-bold text-brand-white'}`}>
          {price.from && <span className="mr-1 text-[11px] font-medium text-brand-gray">from</span>}{price.text}
        </span>
      </a>
    </li>
  )
}

// the picture a family tile carries: its first card's photograph, else its
// first designed header
const tileVisual = (cards) => cards.map(visualOf).find((v) => v?.photo) || visualOf(cards[0])
function TileThumb({ v, icon: Icon }) {
  const box = 'relative block shrink-0 overflow-hidden bg-[#1c1c1e] w-16 h-16 rounded-xl sm:w-full sm:h-auto sm:aspect-[2/1] sm:rounded-none'
  if (v?.photo) {
    return (
      <span className={box}>
        <img src={`${base}images/cards/${v.photo}.webp`} alt="" loading="lazy" decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover/tile:scale-[1.04]" style={v.pos ? { objectPosition: v.pos } : undefined} />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-brand-dark/70 via-transparent to-transparent" />
      </span>
    )
  }
  return (
    <span className={box}>
      <span aria-hidden className="terminal-grid absolute inset-0" />
      <span className="absolute inset-0 flex items-center justify-center"><Icon className="h-7 w-7 sm:h-9 sm:w-9 text-brand-yellow" aria-hidden /></span>
    </span>
  )
}
// One family: a button that opens its list. `hits`: with a lens on, how many
// of the family's products it takes (none: the tile dims).
function FamilyTile({ id, icon: Icon, label, count, from, visual, open, onToggle, href, onJump, allLabel, hits = null, lensName = '', dimmed = false, children }) {
  const dim = dimmed || hits === 0
  return (
    <div className={`rounded-2xl border overflow-hidden transition-[opacity,border-color,background-color] duration-200 ${dim ? 'opacity-40' : ''} ${hits ? 'border-brand-yellow/55 bg-brand-yellow/[0.05]' : 'border-brand-white/10 bg-brand-white/[0.03] hover:border-brand-white/25'}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={id}
        className="group/tile w-full text-left flex sm:block items-center gap-3 p-2.5 sm:p-0">
        <TileThumb v={visual} icon={Icon} />
        <span className="flex min-w-0 flex-1 items-start gap-2 sm:px-4 sm:py-3.5">
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <Icon className="h-4 w-4 shrink-0 text-brand-yellow" aria-hidden />
              <span className="text-[14.5px] font-black leading-snug text-brand-white group-hover/tile:text-brand-yellow transition-colors">{label}</span>
            </span>
            <span className="mt-1 block text-[12.5px] text-brand-gray tabular-nums">
              {count} product{count === 1 ? '' : 's'}{from && <> · <strong className="font-bold text-brand-white">{from}</strong></>}
            </span>
            {hits ? <span className="mt-2 inline-flex items-center rounded-full bg-brand-yellow px-2 py-0.5 text-[10.5px] font-black text-brand-dark tabular-nums">{hits} for {lensName}</span> : null}
          </span>
          <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-brand-gray transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden />
        </span>
      </button>
      <ul id={id} className={`${open ? 'block' : 'hidden'} border-t border-brand-white/10 py-1`}>
        {children}
        <li>
          <a href={href} onClick={(e) => onJump(e, href.slice(1))}
            className="flex items-center gap-1.5 px-4 min-h-11 text-[11px] font-black uppercase tracking-[0.14em] text-brand-yellow">
            {allLabel} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </a>
        </li>
      </ul>
    </div>
  )
}

// ─── Goal chips ─────────────────────────────────────────────────────────────
// The rate card's own objective tags (`impact`, the same list as the Objective
// filter above the cards, whose behaviour is untouched), sharing one lens with
// the four ways in: one at a time, a toggle. The menu still lists every
// product, lights the matches and dims the rest, and "Present these" opens a
// deck of just those products.
const lensLine = (lens, n) => {
  const p = `${n} product${n === 1 ? '' : 's'}`
  if (lens.kind === 'goal') return <>{p} for <span className="text-brand-yellow">{lens.value}</span></>
  const t = lensLabel(lens)
  return <>{p} to <span className="text-brand-yellow">{t.charAt(0).toLowerCase() + t.slice(1)}</span></>
}
function GoalChips({ lens, setLens, onPresent }) {
  const n = lens ? lensCount(lens) : 0
  return (
    <div className="px-5 sm:px-8 py-4 border-b border-brand-white/10 bg-brand-white/[0.02]">
      <div role="group" aria-label="Show products for a goal" className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[11px] font-black uppercase tracking-[0.16em] text-brand-gray">Show products for</span>
        {impacts.map((t) => {
          const on = lens?.kind === 'goal' && lens.value === t
          return (
            <button key={t} type="button" onClick={() => setLens(on ? null : { kind: 'goal', value: t })} aria-pressed={on}
              className={`inline-flex items-center min-h-10 sm:min-h-9 px-3.5 rounded-full border text-[12.5px] font-bold transition-colors ${on
                ? 'bg-brand-yellow border-brand-yellow text-brand-dark'
                : 'border-brand-white/20 text-brand-white/85 hover:border-brand-yellow/60 hover:text-brand-yellow'}`}>
              {t}
            </button>
          )
        })}
      </div>
      <div aria-live="polite">
        {lens && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-sm font-bold text-brand-white tabular-nums">{lensLine(lens, n)}</p>
            <button type="button" onClick={() => onPresent('', lens)}
              className="inline-flex items-center gap-2 min-h-10 sm:min-h-9 px-4 rounded-full bg-brand-yellow text-brand-dark text-[12.5px] font-black hover:brightness-110 transition">
              <Presentation className="w-4 h-4" aria-hidden /> Present these
            </button>
            <button type="button" onClick={() => setLens(null)}
              className="inline-flex items-center min-h-10 sm:min-h-9 text-[12.5px] font-bold text-brand-gray underline underline-offset-2 hover:text-brand-white">
              Show all
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Where do I start? ──────────────────────────────────────────────────────
// Directly above the menu, the same four ways in on every summit card. A way
// sets the menu's lens (the goal-chip mechanism), so the menu below opens on
// the families it covers with its products lit, and "Present these" presents
// just those.
function WaysIn({ lens, setLens, onJump }) {
  return (
    <section id="start" aria-labelledby="start-title" className="jump-section relative bg-brand-dark pt-12 sm:pt-16 pb-5 sm:pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <h2 id="start-title" className="text-[1.75rem] sm:text-4xl font-black text-brand-white uppercase tracking-tight leading-[1.05]">Where do I <span className="text-brand-yellow">start?</span></h2>
        <p className="mt-2 text-brand-gray text-sm sm:text-base max-w-2xl">Pick what you want from the event. The rate card below opens on the products for it.</p>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {WAYS.map((w) => {
            const on = lens?.kind === 'way' && lens.key === w.key
            const n = lensCount({ kind: 'way', key: w.key })
            const from = wayFrom(w)
            const Icon = w.icon
            return (
              <button key={w.key} type="button" aria-pressed={on}
                onClick={() => { setLens(on ? null : { kind: 'way', key: w.key }); if (!on) onJump(null, 'menu') }}
                className={`group/way flex items-start gap-3.5 lg:flex-col lg:gap-3 xl:flex-row xl:gap-3.5 rounded-2xl border px-4 py-4 text-left transition-colors duration-200 ${on
                  ? 'border-brand-yellow bg-brand-yellow/[0.12] shadow-[inset_0_0_0_1px_#ffcf33]'
                  : 'border-brand-white/12 bg-brand-white/[0.04] hover:border-brand-yellow/50 hover:bg-brand-white/[0.07]'}`}>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${on ? 'bg-brand-yellow text-brand-dark' : 'bg-brand-yellow/15 text-brand-yellow'}`}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15.5px] font-black leading-tight text-brand-white group-hover/way:text-brand-yellow transition-colors">{w.title}</span>
                  <span className="mt-1 block text-[12.5px] leading-snug text-brand-gray">{w.line}</span>
                  <span className="mt-2 block text-[12px] font-bold tabular-nums text-brand-white/90">{from !== null && <><span className="font-medium text-brand-gray">from </span>{fmtPrice(from)} · </>}{n} products</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ProductMenu({ onJump, onPresent, lens, setLens }) {
  // the families open with a lens on are the ones it covers
  const [open, setOpen] = useState(() => new Set())
  useEffect(() => {
    setOpen(lens ? new Set(CARDS.filter(({ cards }) => cards.some((c) => cardHasLens(c, lens))).map(({ cat }) => cat)) : new Set())
  }, [lens])
  const toggle = (k) => setOpen((v) => { const n = new Set(v); if (n.has(k)) n.delete(k); else n.add(k); return n })
  const lineMark = (c) => (lens ? (cardHasLens(c, lens) ? 'on' : 'off') : undefined)
  const ticketFrom = `from ${fmtUsd(Math.min(...ticketLadder.map((t) => t.eb)))}`
  const name = lensLabel(lens)
  return (
    <section id="menu" aria-label="Rate card at a glance" className="jump-near relative bg-brand-dark pb-16 sm:pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="rounded-3xl border border-brand-white/12 bg-brand-white/[0.03] overflow-hidden shadow-[0_40px_90px_-30px_rgba(0,0,0,0.75)]">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 px-5 sm:px-8 pt-6 sm:pt-7 pb-5 sm:pb-6 border-b border-brand-white/10">
            <div className="min-w-0 max-w-2xl">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-yellow mb-2">Rate card at a glance</p>
              <p className="text-brand-white text-lg sm:text-2xl font-bold leading-snug">{CARD_COUNT} partnership products in {CARDS.length} families, plus delegate tickets</p>
              <p className="text-brand-gray text-[12.5px] sm:text-sm mt-1.5">Partnership prices in EUR, excluding VAT · ticket prices in USD · open a family to see its products</p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button type="button" onClick={() => onPresent('')}
                className="inline-flex items-center gap-2 min-h-10 px-5 rounded-full border border-brand-white/25 text-brand-white font-bold text-[11px] sm:text-xs uppercase tracking-widest hover:border-brand-yellow hover:text-brand-yellow transition-colors whitespace-nowrap">
                <Presentation className="w-4 h-4" aria-hidden /> Present the rate card
              </button>
              <button type="button" onClick={downloadRateCardPDF}
                className="inline-flex items-center gap-2 min-h-10 px-5 rounded-full border border-brand-yellow/50 text-brand-yellow font-bold text-[11px] sm:text-xs uppercase tracking-widest hover:bg-brand-yellow/10 transition-colors whitespace-nowrap">
                <Download className="w-4 h-4" aria-hidden /> Download Full Rate Card
              </button>
            </div>
          </div>
          <GoalChips lens={lens} setLens={setLens} onPresent={onPresent} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-start gap-3 p-3 sm:p-5 md:p-6">
            {CARDS.map(({ cat, cards }) => (
              <FamilyTile key={cat} id={`menu-${catId(cat)}`} icon={FAMILY_META[cat]?.icon || Layers} label={cat}
                count={cards.length} from={familyFrom(cards)} visual={tileVisual(cards)}
                open={open.has(cat)} onToggle={() => toggle(cat)}
                hits={lens ? cards.filter((c) => cardHasLens(c, lens)).length : null} lensName={name}
                href={`#${catId(cat)}`} onJump={onJump} allLabel={`Go to ${FAMILY_META[cat]?.short || cat}`}>
                {cards.map((c) => (
                  <MenuLine key={c.key} href={`#${productId(c)}`} onClick={(e) => onJump(e, productId(c))} title={c.title} price={menuPrice(c)} mark={lineMark(c)} />
                ))}
              </FamilyTile>
            ))}
            {/* tickets carry no goal tags, so a lens dims them */}
            <FamilyTile id="menu-tickets" icon={Ticket} label="Delegate Tickets" count={ticketLadder.length} from={ticketFrom}
              visual={null} dimmed={Boolean(lens)} open={open.has('tickets')} onToggle={() => toggle('tickets')}
              href="#tickets" onJump={onJump} allLabel="Go to Tickets">
              {ticketLadder.map((t) => (
                <MenuLine key={t.type} href={`#${ticketId(t)}`} onClick={(e) => onJump(e, ticketId(t))} title={t.type} price={{ from: true, text: fmtUsd(t.eb) }} mark={lens ? 'off' : undefined} />
              ))}
            </FamilyTile>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 sm:px-8 py-3 sm:py-4 border-t border-brand-white/10 text-[11px] font-black uppercase tracking-[0.14em]">
            <span className="basis-full sm:basis-auto text-brand-gray/70">Also on this page</span>
            {[["Who's in the room", 'audience'], ['Tickets', 'tickets'], ['Recognition', 'recognition'], ['ROI Calculator', 'roi-calculator']].map(([t, id]) => (
              <a key={id} href={`#${id}`} onClick={(e) => onJump(e, id)} className="inline-flex items-center gap-1.5 min-h-10 text-brand-white hover:text-brand-yellow transition-colors">
                {t} <ArrowRight className="w-3 h-3" aria-hidden />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// Sticks under the fixed nav while the rate card is on screen: it lives inside
// #pricing, so it leaves with the section. The family in view is highlighted;
// on a phone the row scrolls and keeps that chip in view.
function FamilyBar({ groups, active, onJump, barRef }) {
  const rowRef = useRef(null)
  useEffect(() => {
    const row = rowRef.current
    const chip = row?.querySelector('[aria-current="true"]')
    if (!row || !chip) return
    const left = chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2
    row.scrollTo({ left: Math.max(0, left), behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [active])
  return (
    <div ref={barRef} className="sticky z-30 bg-brand-dark/95 backdrop-blur-md border-y border-brand-white/10 shadow-[0_10px_30px_-14px_rgba(0,0,0,0.7)]"
      style={{ top: 'var(--nav-h, 72px)' }}>
      <nav aria-label="Product families" className="max-w-7xl mx-auto px-2 sm:px-8">
        <div ref={rowRef} className="no-scrollbar fade-x relative flex items-center gap-0.5 overflow-x-auto py-1.5">
          <a href="#menu" onClick={(e) => onJump(e, 'menu')}
            className="shrink-0 inline-flex items-center gap-1.5 h-10 sm:h-9 rounded-full px-2.5 text-[12.5px] font-bold text-brand-white hover:text-brand-yellow transition-colors whitespace-nowrap">
            <ArrowUp className="w-3.5 h-3.5" aria-hidden /> Menu
          </a>
          <span className="w-px h-5 bg-brand-white/15 mx-1 shrink-0" aria-hidden />
          {groups.map(({ cat }) => {
            const on = active === cat
            return (
              <a key={cat} href={`#${catId(cat)}`} onClick={(e) => onJump(e, catId(cat))} aria-current={on ? 'true' : undefined}
                className={`shrink-0 inline-flex items-center h-10 sm:h-9 whitespace-nowrap rounded-full px-3 text-[12.5px] font-bold transition-colors ${on ? 'bg-brand-yellow text-brand-dark' : 'text-brand-gray hover:text-brand-white'}`}>
                {FAMILY_META[cat]?.short || cat}
              </a>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function FamilyHeading({ cat, count }) {
  const Icon = FAMILY_META[cat]?.icon || Layers
  return (
    <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
      <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0"><Icon className="w-5 h-5" aria-hidden /></span>
      <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-brand-white uppercase leading-tight">{cat.replace(/-/g, '‑')}</h3>
      <div className="h-px bg-brand-yellow/30 flex-1 min-w-6" />
      <span className="hidden sm:block text-[11px] font-black uppercase tracking-[0.16em] text-brand-gray whitespace-nowrap">{count} product{count === 1 ? '' : 's'}</span>
    </div>
  )
}

function FilterRow({ label, options, active, setActive }) {
  return (
    <div className="no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-2 overflow-x-auto sm:flex-wrap sm:justify-center">
      <span className="shrink-0 text-[10px] uppercase tracking-widest text-brand-gray font-bold mr-1">{label}:</span>
      {options.map((f) => (
        <button key={f} type="button" onClick={() => setActive(active === f ? null : f)} aria-pressed={active === f}
          className={`shrink-0 inline-flex items-center h-10 sm:h-9 px-3.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider border transition-all whitespace-nowrap ${active === f ? 'bg-brand-yellow text-brand-dark border-brand-yellow' : 'border-brand-white/20 text-brand-gray hover:border-brand-yellow/60 hover:text-brand-white'}`}>
          {f}
        </button>
      ))}
    </div>
  )
}

// ─── Tickets, recognition and proof blocks ─────────────────────────────────
// Each is one component shared by the page and Present mode, so a slide shows
// the page's own figures and never a retyped copy.
function TicketStages({ className = '' }) {
  return (
    <p className={className}>
      Three published price stages: <strong className="text-brand-white">Early Bird</strong>, <strong className="text-brand-white">Standard</strong> and <strong className="text-brand-white">Late</strong>.
      Early Bird pricing goes live on <strong className="text-brand-white">16 November 2026</strong>. Each stage closes on its published date or when its allocation
      sells out, whichever comes first - and prices never come back down.
    </p>
  )
}

// One table: a ruled ladder from md, and on a phone each ticket becomes its own
// block with its three stage prices side by side (the old table scrolled
// sideways there, hiding Standard, Late and the access notes). On the page each
// row is a deep-link target (t-<slug>); a slide renders it without ids - the
// page stays mounted under the deck and ids must stay unique - and can light
// the row a link asked for.
function TicketLadder({ anchors = true, highlight = null, className = '' }) {
  return (
    <div className={`clip-box rounded-2xl border border-brand-white/10 bg-brand-white/[0.02] ${className}`}>
      <table className="w-full text-left">
        <caption className="sr-only">Delegate ticket prices in USD, by stage</caption>
        <thead className="hidden md:table-header-group">
          <tr className="text-[11px] uppercase tracking-widest text-brand-gray border-b border-brand-white/10">
            <th scope="col" className="px-6 py-4 font-bold">Ticket</th>
            <th scope="col" className="px-6 py-4 font-bold text-brand-yellow">Early Bird</th>
            <th scope="col" className="px-6 py-4 font-bold">Standard</th>
            <th scope="col" className="px-6 py-4 font-bold">Late</th>
            <th scope="col" className="px-6 py-4 font-bold">Access</th>
          </tr>
        </thead>
        <tbody className="block md:table-row-group">
          {ticketLadder.map((t) => (
            <tr key={t.type} id={anchors ? ticketId(t) : undefined}
              className={`${anchors ? 'jump-near ' : ''}grid grid-cols-3 gap-x-2 gap-y-2.5 px-4 sm:px-5 py-5 border-t first:border-t-0 border-brand-white/8 md:table-row md:p-0 transition-colors ${highlight === ticketId(t) ? 'bg-brand-yellow/[0.08]' : 'md:hover:bg-brand-white/[0.03]'}`}>
              <th scope="row" className="col-span-3 md:px-6 md:py-4 font-bold text-brand-white text-base whitespace-nowrap">{t.type}</th>
              {[['Early Bird', t.eb, true], ['Standard', t.std, false], ['Late', t.late, false]].map(([stage, v, eb]) => (
                <td key={stage} className={`rounded-lg px-3 py-2.5 md:rounded-none md:bg-transparent md:px-6 md:py-4 whitespace-nowrap ${eb ? 'bg-brand-yellow/[0.1]' : 'bg-brand-white/[0.04]'}`}>
                  <span className={`block md:hidden text-[9.5px] font-black uppercase tracking-[0.14em] mb-1 ${eb ? 'text-brand-yellow' : 'text-brand-gray'}`}>{stage}</span>
                  <span className={`tabular-nums ${eb ? 'font-semibold text-brand-yellow' : 'text-brand-white/90'}`}>{fmtUsd(v)}</span>
                </td>
              ))}
              <td className="col-span-3 md:px-6 md:py-4 text-xs text-brand-gray leading-relaxed">{t.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TicketOffers({ className = '' }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 ${className}`}>
      {TICKET_OFFERS.map(({ title, icon: Icon, body }) => (
        <div key={title} className="bg-brand-white/5 border border-brand-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Icon className="w-5 h-5 text-brand-yellow" aria-hidden />
            <h4 className="font-black text-brand-white uppercase text-sm tracking-wide">{title}</h4>
          </div>
          <p className="text-sm text-brand-gray leading-relaxed">{body}</p>
        </div>
      ))}
    </div>
  )
}

// `reached` names the level a plan reaches; Present mode marks that tile.
function RecognitionLevels({ reached = null, className = '' }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 ${className}`}>
      {RECOGNITION.map(([name, band, color, desc]) => (
        <div key={name}
          className={`relative rounded-2xl border p-6 flex flex-col ${name === 'Headline' ? 'sm:col-span-2 lg:col-span-1 border-brand-yellow/60 bg-brand-yellow/8' : 'border-brand-white/10 bg-brand-white/5'} ${reached === name ? 'ring-2 ring-brand-yellow ring-offset-2 ring-offset-brand-dark' : ''}`}>
          {reached === name && <span className="absolute -top-2.5 left-5 rounded-full bg-brand-yellow px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-brand-dark">Your selection</span>}
          <p className={`text-xl font-black uppercase mb-1 ${color}`}>{name}</p>
          <p className="text-xs text-brand-gray mb-4 tabular-nums">{band}</p>
          <p className="text-xs text-brand-gray leading-relaxed">{desc}</p>
        </div>
      ))}
    </div>
  )
}

// `side`: three across on a tablet, stacked rows in a side column from lg.
// `big`: the Present-mode size.
function NpsTiles({ side = false, big = false, className = '' }) {
  const grid = side ? 'grid-cols-1 sm:grid-cols-3 lg:grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'
  const tile = side
    ? 'flex sm:block lg:flex items-center gap-4 text-left sm:text-center lg:text-left px-4 py-3.5 sm:px-3 sm:py-5 lg:px-5 lg:py-4'
    : `flex sm:block items-center gap-4 text-left sm:text-center px-4 py-3.5 ${big ? 'sm:px-4 sm:py-6' : 'sm:px-3 sm:py-5'}`
  const num = [
    big ? 'w-20 text-4xl sm:text-5xl' : 'w-14 text-3xl',
    'sm:w-auto sm:mb-1',
    side ? (big ? 'lg:w-32 lg:mb-0' : 'lg:w-16 lg:mb-0') : '',
  ].join(' ')
  return (
    <div className={`grid ${grid} gap-3 sm:gap-4 ${className}`}>
      {NPS_PROOF.map(([n, label, ours]) => (
        <div key={label} className={`${tile} rounded-xl bg-brand-white/5 border border-brand-white/10`}>
          <p className={`${num} shrink-0 font-bold leading-none tabular-nums ${ours ? 'text-brand-yellow' : 'text-brand-gray'}`}>{n}</p>
          <p className="text-brand-gray text-xs uppercase tracking-widest leading-snug">{label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── The value row, on every card and product slide ──────────────────────────
// What this product gives back for its price (`reachFor`). A small "Up to" sits
// over a figure that is a maximum and "From" over a cost that is a floor; the
// row keeps that line for every figure so the numbers stay level. The heading
// reads "Estimated reach" only when a figure rests on an assumption or an
// estimate; a measured fact prints its source and keeps "At a glance".
// Laid out by its own width (a container query), never the screen's: in a wide
// box the figures stand side by side, each number over its label; in a narrow
// one (a phone, a card two or three up) each figure is a row, the number beside
// its label, so a value never wraps or runs out of its column.
const REACH_COLS = { 1: '@min-[22rem]:grid-cols-1', 2: '@min-[22rem]:grid-cols-2', 3: '@min-[22rem]:grid-cols-3' }
function ReachRow({ item, className = '' }) {
  const r = reachFor(item)
  if (!r) return null
  const pre = r.figs.some((f) => f.pre)
  // a single figure stays one line at every width: the number beside its label
  const one = r.figs.length === 1
  return (
    <figure className={`@container rounded-xl border border-brand-white/10 bg-brand-white/[0.03] px-4 py-3.5 ${className}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-gray">{r.estimate ? 'Estimated reach' : 'At a glance'}</p>
      <div className={one
        ? 'mt-2.5 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3'
        : `mt-2.5 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-2.5 @min-[22rem]:items-start @min-[22rem]:gap-3 ${REACH_COLS[r.figs.length]}`}>
        {r.figs.map((f) => (one ? (
          <p key={f.label} className="contents">
            <span className="flex items-baseline gap-1.5 whitespace-nowrap">
              {f.pre && <span className="text-[9.5px] font-bold uppercase tracking-[0.12em] leading-none text-brand-gray">{f.pre}</span>}
              <span className="text-xl @min-[26rem]:text-2xl font-black leading-none tabular-nums text-brand-yellow">{f.value}</span>
            </span>
            <span className="text-[10.5px] @min-[26rem]:text-[11px] leading-snug text-brand-white/75">{f.label}</span>
          </p>
        ) : (
          <p key={f.label} className="contents @min-[22rem]:block @min-[22rem]:min-w-0">
            <span className="flex items-baseline gap-1.5 whitespace-nowrap @min-[22rem]:block">
              {pre && <span className={`${f.pre ? 'inline' : 'hidden'} @min-[22rem]:block @min-[22rem]:mb-1 text-[9.5px] font-bold uppercase tracking-[0.12em] leading-none text-brand-gray`}>{f.pre || '\u00a0'}</span>}
              <span className="text-xl @min-[26rem]:text-2xl font-black leading-none tabular-nums text-brand-yellow @min-[22rem]:block">{f.value}</span>
            </span>
            <span className="text-[10.5px] @min-[26rem]:text-[11px] leading-snug text-brand-white/75 @min-[22rem]:mt-1.5 @min-[22rem]:block">{f.label}</span>
          </p>
        )))}
      </div>
      {r.note && <figcaption className="mt-2 text-[10.5px] leading-snug text-brand-gray">{r.note}</figcaption>}
    </figure>
  )
}

// ─── The hero: a market night in Lower Manhattan ───────────────────────────
// Three pieces, all decoration over the page's own facts: a ticker tape under
// the nav (TICKER reads EVENT_STATS, NPS_PROOF and the date line, nothing
// else, and the same facts are on the page, so it is hidden from screen
// readers), a probability line that climbs across the sky, and the
// Financial District drawn along the foot of the hero (skyline.js). The line
// draws in once and the ticker runs; both hold still under reduced motion.
const TICKER = [
  ['New York City', 'October 2027'],
  ...EVENT_STATS.map(([v, l]) => [l, v]),
  // the tape shows each score without its benchmark: the label's "+23" would
  // run straight into the score. The tiles, the proof band and the PDFs keep it.
  ...NPS_PROOF.map(([v, l]) => [l.replace(/ · benchmark \+\d+$/, ''), v]),
]
function MarketTicker() {
  const row = (copy) => TICKER.map(([label, value]) => (
    <span key={`${copy}-${label}`} className="inline-flex items-center gap-2.5 pl-6">
      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] text-brand-white/60">{label}</span>
      <span className="text-xs sm:text-[13px] font-black tabular-nums text-brand-yellow">{value}</span>
      <span className="ml-4 h-1 w-1 rotate-45 bg-brand-yellow/60" />
    </span>
  ))
  return (
    <div aria-hidden="true" className="absolute inset-x-0 z-20 overflow-hidden border-b border-brand-white/10 bg-[#19191b]/90 backdrop-blur-sm"
      style={{ top: 'var(--nav-h, 72px)' }}>
      <div className="ticker-track flex w-max whitespace-nowrap py-2">{row('a')}{row('b')}</div>
    </div>
  )
}

const HERO_LINE = probabilityLine()
const FIDI_HTML = wallStreetSVG('ws-hero')
function MarketBackdrop() {
  const [ex, ey] = HERO_LINE.end
  return (
    <div aria-hidden="true" className="absolute inset-0 z-0 pointer-events-none">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,207,51,0.1),transparent_55%)]" />
      <div className="terminal-grid absolute inset-0" />
      <div className="line-draw absolute inset-x-0 top-[104px] h-[250px] sm:top-[112px] sm:h-[290px]">
        <svg viewBox="0 0 1000 400" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id="np-line-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffcf33" stopOpacity="0.09" /><stop offset="1" stopColor="#ffcf33" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="np-line-fade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" /><stop offset="0.8" stopColor="#fff" /><stop offset="0.94" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <mask id="np-line-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="400"><rect width="1000" height="400" fill="url(#np-line-fade)" /></mask>
          </defs>
          <path d={HERO_LINE.area} fill="url(#np-line-area)" mask="url(#np-line-mask)" />
          <polyline points={HERO_LINE.line} fill="none" stroke="#ffcf33" strokeOpacity="0.55" strokeWidth="1.75" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
        <span className="line-dot absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${ex * 100}%`, top: `${ey * 100}%` }}>
          <span className="absolute inset-0 rounded-full bg-brand-yellow/60 animate-ping motion-reduce:animate-none" />
          <span className="relative block h-2.5 w-2.5 rounded-full bg-brand-yellow shadow-[0_0_14px_rgba(255,207,51,0.9)]" />
        </span>
      </div>
    </div>
  )
}
// Lower Manhattan as a band under the chips, edge to edge; the proof that
// follows carries .on-river and sits on the lower half of the towers.
function FidiBand() {
  return (
    <div aria-hidden="true" className="fidi-band">
      <svg viewBox={FIDI_VIEWBOX} preserveAspectRatio="xMidYMax slice" focusable="false"
        dangerouslySetInnerHTML={{ __html: FIDI_HTML }} />
    </div>
  )
}

// ─── Logos: every one the same white mark on charcoal ──────────────────────
// Built by scripts/build_room_logos.py from official files (NEXT's own partner
// files on nextpredict.io, the sibling repos, Wikimedia Commons), each baked to
// a structure-preserving white mark and trimmed to its content box, so the
// strips read as one family. `ratio` is the mark's width over its height; a
// mark is sized to a common area, so a long wordmark and a square emblem look
// the same weight.
const logoHeight = (ratio, area, min, max) => Math.round(Math.min(max, Math.max(min, Math.sqrt(area / ratio))))
// `fit`: in a grid cell narrower than the mark (a long wordmark on a 320px
// phone), the mark shrinks to the cell and keeps its proportions.
function LogoMark({ logo, area = 2800, min = 15, max = 38, fit = false }) {
  const h = logoHeight(logo.ratio, area, min, max)
  return (
    <img src={`${base}logos/room/${logo.file}`} alt={logo.name} title={logo.name} loading="lazy" decoding="async"
      width={Math.round(h * logo.ratio)} height={h} style={{ height: h, width: Math.round(h * logo.ratio) }}
      className={`block shrink-0 select-none opacity-90 ${fit ? 'max-w-full object-contain' : 'max-w-none'}`} />
  )
}
// Two copies of the row run end to end; hover pauses it, and under reduced
// motion it stands still and wraps (the copy hides).
function LogoMarquee({ logos, label }) {
  return (
    <div className="marquee-mask relative overflow-hidden" role="group" aria-label={label}>
      <ul className="marquee-row flex w-max items-center gap-y-5 py-3">
        {[...logos, ...logos].map((l, i) => (
          <li key={`${l.key}-${i}`} className={`pr-10 sm:pr-14 ${i >= logos.length ? 'marquee-copy' : ''}`} aria-hidden={i >= logos.length ? 'true' : undefined}>
            <LogoMark logo={l} />
          </li>
        ))}
      </ul>
    </div>
  )
}
function LogoRow({ logos, area = 2400, max = 32, className = '' }) {
  return (
    <ul className={`flex flex-wrap items-center gap-x-8 sm:gap-x-10 gap-y-4 ${className}`}>
      {logos.map((l) => <li key={l.key}><LogoMark logo={l} area={area} max={max} /></li>)}
    </ul>
  )
}
const LABEL = 'text-[10.5px] font-black uppercase tracking-[0.18em] text-brand-gray'
const lc1 = (t) => t.charAt(0).toLowerCase() + t.slice(1)

// ─── The proof band, straight after the hero ────────────────────────────────
// The same shape on every summit card: the headline figures with their source,
// then the logos. For NEXTPredict the figures are the 2026 room (NEXT's own
// snapshot, always with ROOM_LABEL), the press that was accredited, the
// registered companies as a marquee, this year's partners, and the team's
// partner NPS. No paragraphs.
function ProofBand() {
  return (
    <section id="proof" aria-labelledby="proof-title" className="proof-band jump-section relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pb-4 sm:pb-6">
        <div className="rounded-3xl border border-brand-white/12 bg-[#1f1f21]/80 backdrop-blur-md px-5 sm:px-8 py-6 sm:py-8 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.8)]">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 id="proof-title" className="text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] text-brand-yellow">Who is in the room</h2>
            <p className="text-[11.5px] sm:text-xs text-brand-gray">{ROOM_LABEL}</p>
          </div>
          <dl className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {ROOM_FIGURES.map(([n, l]) => (
              <div key={l} className="flex flex-col-reverse rounded-2xl border border-brand-white/10 bg-brand-white/[0.04] px-4 py-4 sm:px-5 sm:py-5">
                <dt className="mt-2 text-[11px] sm:text-xs font-bold uppercase tracking-[0.12em] leading-snug text-brand-white/80">{l}</dt>
                <dd className="text-[2.35rem] sm:text-5xl font-black leading-none tabular-nums text-brand-yellow">{n}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-col lg:flex-row lg:items-center gap-x-8 gap-y-3">
            <p className={`${LABEL} lg:w-40 shrink-0`}>Accredited press</p>
            <LogoRow logos={PRESS_LOGOS} area={2300} max={30} />
          </div>
          <div className="mt-5 flex flex-col lg:flex-row lg:items-center gap-x-8 gap-y-1">
            <p className={`${LABEL} lg:w-40 shrink-0`}>Registered for 2026</p>
            <div className="min-w-0 flex-1"><LogoMarquee logos={REGISTERED_LOGOS} label="Organisations registered for NEXTPredict 2026" /></div>
          </div>
          <div className="mt-5 flex flex-col lg:flex-row lg:items-center gap-x-8 gap-y-3">
            <p className={`${LABEL} lg:w-40 shrink-0`}>2026 partners</p>
            <LogoRow logos={PARTNER_LOGOS} area={2300} max={30} />
          </div>
          <div className="mt-6 pt-5 border-t border-brand-white/10 flex flex-col lg:flex-row lg:items-center gap-x-8 gap-y-3">
            <p className={`${LABEL} lg:w-40 shrink-0`}>The team&rsquo;s record</p>
            <ul className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
              {NPS_PROOF.map(([n, l, ours]) => (
                <li key={l} className="flex items-baseline gap-2">
                  <span className={`text-2xl font-black tabular-nums leading-none ${ours ? 'text-brand-yellow' : 'text-brand-gray'}`}>{n}</span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-white/75">{l}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-5 text-[11px] leading-relaxed text-brand-gray">{ROOM_SOURCE} {LOGOS_NOTE} {NPS_SOURCE}</p>
        </div>
      </div>
    </section>
  )
}

// ─── Who's in the room: the 2026 room in full, and why partner ─────────────
// One section where the About and The Room sections used to stack (the through
// line: merge, don't stack): the seniority of the 2026 room, the whole logo
// wall, then why partner with the team's partner NPS (#about lands there).
function SeniorityBars() {
  const max = Math.max(...ROOM_SENIORITY.map(([, v]) => v))
  return (
    <ul className="space-y-2.5">
      {ROOM_SENIORITY.map(([label, v], i) => (
        <li key={label} className="grid grid-cols-[minmax(0,9.5rem)_1fr_2.75rem] items-center gap-3">
          <span className="text-[12.5px] text-brand-white/85 leading-tight">{label}</span>
          <span className="h-2.5 rounded-full bg-brand-white/8 overflow-hidden" aria-hidden>
            <span className={`block h-full rounded-full ${i < 4 ? 'bg-brand-yellow' : 'bg-brand-gray/50'}`} style={{ width: `${(v / max) * 100}%` }} />
          </span>
          <span className={`text-right text-sm font-black tabular-nums ${i < 4 ? 'text-brand-yellow' : 'text-brand-gray'}`}>{v}%</span>
        </li>
      ))}
    </ul>
  )
}
function RoomSection() {
  return (
    <section id="audience" className="jump-section py-20 md:py-24 bg-brand-dark relative border-y border-brand-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <SectionHead title="Who's In" accent="The Room" lede={ROOM_LEDE} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-5 rounded-3xl border border-brand-white/10 bg-brand-white/[0.03] p-6 sm:p-8">
            <p className={LABEL}>Seniority, share of the room</p>
            <p className="mt-3 text-brand-white text-lg font-bold leading-snug"><span className="text-brand-yellow font-black">{ROOM_FIGURES[0][0]}</span> {lc1(ROOM_FIGURES[0][1])}, <span className="text-brand-yellow font-black">{ROOM_FIGURES[1][0]}</span> {lc1(ROOM_FIGURES[1][1])}</p>
            <div className="mt-5"><SeniorityBars /></div>
            <div className="mt-6 pt-5 border-t border-brand-white/10 flex items-baseline gap-3">
              <span className="text-3xl font-black tabular-nums text-brand-yellow">{ROOM_BLOC[0]}</span>
              <span className="text-sm text-brand-white/85 leading-snug">{ROOM_BLOC[1]}</span>
            </div>
            <p className="mt-5 text-[11px] leading-relaxed text-brand-gray">{ROOM_LABEL}. {ROOM_SOURCE}</p>
          </div>
          <div className="lg:col-span-7">
            <p className={LABEL}>Registered for 2026</p>
            <ul className="mt-5 grid grid-cols-2 min-[480px]:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-7 items-center">
              {REGISTERED_LOGOS.map((l) => <li key={l.key} className="flex min-w-0 items-center justify-center min-h-10"><LogoMark logo={l} area={2600} max={36} fit /></li>)}
            </ul>
            <div className="mt-8 pt-6 border-t border-brand-white/10 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className={LABEL}>Accredited press</p>
                <LogoRow logos={PRESS_LOGOS} className="mt-4" area={2100} max={28} />
              </div>
              <div>
                <p className={LABEL}>2026 partners</p>
                <LogoRow logos={PARTNER_LOGOS} className="mt-4" area={2100} max={28} />
              </div>
            </div>
            <p className="mt-6 text-[11px] leading-relaxed text-brand-gray">{LOGOS_NOTE}</p>
          </div>
        </div>

        {/* the anchor is a still wrapper: the box inside animates in, and a moving target lands short */}
        <div id="about" className="jump-section mt-14 md:mt-16">
        <div className="bg-brand-white/5 border border-brand-white/10 rounded-3xl p-6 sm:p-10 md:p-12 relative overflow-hidden" data-anim style={anim}>
          <div className="absolute right-0 top-0 w-96 h-96 bg-brand-yellow/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 lg:items-center">
            <div className="lg:col-span-7 max-w-3xl">
              <div className="inline-block bg-brand-yellow text-brand-dark font-bold px-4 py-1 rounded-sm mb-6 text-sm">WHY PARTNER</div>
              <h3 className="text-[1.75rem] sm:text-3xl md:text-4xl font-bold text-brand-white mb-6 leading-tight">{WHY_PARTNER.title} <span className="text-brand-yellow">{WHY_PARTNER.accent}</span></h3>
              <p className="text-base sm:text-lg text-brand-gray leading-relaxed">{WHY_PARTNER.body}</p>
            </div>
            <div className="lg:col-span-5">
              <p className="text-base sm:text-lg text-brand-gray leading-relaxed">{WHY_PARTNER.npsIntro}</p>
              <NpsTiles side className="mt-6 max-w-xl" />
              <p className="text-xs text-brand-gray mt-4 opacity-60">{NPS_SOURCE}</p>
            </div>
          </div>
        </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-8 md:mt-10" data-anim style={anim}>
          {ROOM_PILLARS.map(([title, body]) => (
            <div key={title} className="bg-brand-white/5 p-6 rounded-xl border border-brand-white/10 hover:border-brand-yellow transition-colors duration-300">
              <h4 className="text-brand-yellow font-bold mb-3 uppercase">{title}</h4>
              <p className="text-sm text-brand-gray leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Tickets section ────────────────────────────────────────────────────────
function TicketsSection() {
  return (
    <section id="tickets" className="jump-section py-20 md:py-24 bg-brand-dark relative border-b border-brand-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <SectionHead title="Delegate" accent="Tickets">
          <TicketStages className="text-brand-gray max-w-3xl mx-auto mt-5 leading-relaxed" />
        </SectionHead>

        {/* the ladder stays at rest (no reveal): its rows are deep-link targets */}
        <TicketLadder className="mb-8" />

        <div data-anim style={anim}>
          <TicketOffers />
        </div>

        <p className="text-center text-brand-gray text-xs mt-8 opacity-70" data-anim style={anim}>{TICKET_FOOTNOTE}</p>
      </div>
    </section>
  )
}

// ─── ROI calculator ─────────────────────────────────────────────────────────
// New York's calculator (the through line, 29 Sep 2026: the three summit
// cards match): the same four inputs, the same arithmetic, the same outputs.
// Once Your selection has items its total is the investment (the 2026
// rebooking rate applied when it is on); before that a slider stands in. Deal
// size, leads and close rate are the buyer's own estimates, so the card claims
// nothing about them. The selection list, the plan link and the proposal are
// the calculator panel's own.
function RoiSlider({ id, label, value, shown, min, max, step, onChange, lo, hi }) {
  return (
    <div>
      <div className="flex justify-between gap-3 mb-1">
        <label htmlFor={id} className="text-brand-white font-semibold">{label}</label>
        <span className="text-brand-yellow font-bold tabular-nums">{shown}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="range-yellow w-full cursor-pointer" />
      <div className="flex justify-between text-xs text-brand-gray"><span>{lo}</span><span>{hi}</span></div>
    </div>
  )
}
function RoiCalculator({ cart, onRemove, rebooking }) {
  const [investment, setInvestment] = useState(25000)
  const [dealSize, setDealSize] = useState(50000)
  const [leads, setLeads] = useState(15)
  const [closeRate, setCloseRate] = useState(20)
  const has = cart.length > 0
  const eff = has ? planTotal(cart, rebooking) : (rebooking ? investment * 0.85 : investment)
  const closed = Math.round(leads * (closeRate / 100) * 10) / 10
  // revenue counts whole deals, and the line under it quotes that same number
  const deals = Math.round(closed)
  const revenue = deals * dealSize
  const profit = revenue - eff
  const roi = eff > 0 ? Math.round((profit / eff) * 100) : 0
  const tier = resolveTier(eff, cart)
  const next = nextSpendTier(eff, cart)
  const reachedIdx = tier === HEADLINE_TIER ? TIERS.length - 1 : TIERS.findIndex((t) => t.name === tier.name)
  const pct = next ? Math.min(100, ((eff - tier.min) / (next.min - tier.min)) * 100) : 100
  return (
    <section id="roi-calculator" className="jump-section py-20 md:py-24 bg-brand-dark relative border-y border-brand-white/10 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-brand-yellow/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-brand-white/5 rounded-full blur-3xl" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
        <SectionHead title="Sponsorship" accent="ROI Calculator"
          lede={<>Estimate your return on investment. Adjust the figures to your own average deal size and the engagement you expect at <Brand /> 2027.</>}>
          <div className="mt-8 inline-block bg-brand-white/5 border border-brand-white/10 rounded-3xl px-6 py-5 md:px-12 md:py-6 shadow-lg">
            <span className="text-brand-white uppercase tracking-widest text-xs sm:text-sm font-bold block mb-2">{has ? 'Your selection' : 'Total package investment'}</span>
            <span className="text-4xl sm:text-5xl md:text-6xl font-black text-brand-yellow tabular-nums">{fmtPrice(Math.round(eff))}</span>
            {rebooking && <span className="block mt-2 text-[11px] font-semibold uppercase tracking-wide text-brand-yellow/75">15% rebooking rate applied</span>}
          </div>
        </SectionHead>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-7 bg-brand-white/5 border border-brand-white/10 rounded-3xl p-5 sm:p-8 md:p-10">
            <h3 className="text-xl sm:text-2xl font-bold text-brand-white mb-8 uppercase flex items-center gap-3">
              <Target className="text-brand-yellow w-6 h-6" aria-hidden /> Your Projections
            </h3>
            <div className="space-y-8">
              {has ? (
                <div className="space-y-2">
                  <p className="text-xs text-brand-gray uppercase tracking-widest font-bold">Your selection</p>
                  {cart.map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-brand-white/5 rounded-lg pl-3 pr-1 py-0.5 border border-brand-white/10">
                      <span className="text-sm text-brand-white truncate flex-1">{item.title}</span>
                      <span className="text-sm font-bold text-brand-yellow ml-2 shrink-0 tabular-nums">{item.poa ? 'POA' : fmtPrice(rebooking ? Math.round(item.price * 0.85) : item.price)}</span>
                      <button type="button" onClick={() => onRemove(i)} aria-label={`Remove ${item.title}`}
                        className="ml-1 w-10 h-10 shrink-0 flex items-center justify-center rounded-lg text-brand-gray hover:text-brand-white hover:bg-brand-white/10 transition-colors">
                        <X className="w-3.5 h-3.5" aria-hidden />
                      </button>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-brand-white/10">
                    <span className="text-sm font-bold text-brand-white">Total</span>
                    <span className="text-sm font-bold text-brand-yellow tabular-nums">{fmtPrice(planTotal(cart, rebooking))}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
                    <CopyLinkButton text={() => planLink(cart)} label="Copy plan link" done="Plan link copied" title="Copy a link that opens this selection"
                      look="-ml-3 inline-flex items-center gap-1.5 min-h-10 rounded-full px-3 text-xs font-bold" className="text-brand-yellow hover:bg-brand-white/5" />
                    <span className="text-xs text-brand-gray">Opens this page with the same selection.</span>
                  </div>
                </div>
              ) : (
                <RoiSlider id="roi-investment" label="Sponsorship Investment" value={investment} shown={fmtPrice(investment)}
                  min={5000} max={500000} step={5000} onChange={setInvestment} lo="€5k" hi="€500k" />
              )}
              <RoiSlider id="roi-deal" label="Average Deal Size (LTV/ACV)" value={dealSize} shown={fmtPrice(dealSize)}
                min={5000} max={500000} step={5000} onChange={setDealSize} lo="€5k" hi="€500k+" />
              <RoiSlider id="roi-leads" label="Expected Qualified Leads" value={leads} shown={`${leads} Leads`}
                min={1} max={100} step={1} onChange={setLeads} lo="1" hi="100+" />
              <RoiSlider id="roi-close" label="Expected Close Rate" value={closeRate} shown={`${closeRate}%`}
                min={1} max={100} step={1} onChange={setCloseRate} lo="1%" hi="100%" />
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="bg-brand-yellow text-brand-dark rounded-3xl p-6 sm:p-8 md:p-10 shadow-[0_0_30px_rgba(255,207,51,0.15)] relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-10 translate-x-4 -translate-y-4" aria-hidden>
                <TrendingUp className="w-[120px] h-[120px]" />
              </div>
              <h3 className="text-lg sm:text-xl font-black uppercase tracking-widest mb-8 opacity-80">Estimated Returns</h3>
              <div className="space-y-8 relative z-10" aria-live="polite">
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest opacity-80 mb-1">Estimated Revenue</p>
                  <p className="text-4xl sm:text-5xl font-black tracking-tighter tabular-nums">{fmtPrice(revenue)}</p>
                  <p className="text-sm font-medium mt-2 opacity-80">Based on {deals} closed {deals === 1 ? 'deal' : 'deals'}</p>
                </div>
                <div className="h-px w-full bg-brand-dark/10" />
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest opacity-80 mb-1">Net Profit</p>
                  <p className="text-3xl sm:text-4xl font-black tracking-tighter tabular-nums">{profit < 0 ? '−' : ''}{fmtPrice(Math.abs(Math.round(profit)))}</p>
                </div>
                <div className="h-px w-full bg-brand-dark/10" />
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest opacity-80 mb-1">Projected ROI</p>
                  <p className="text-5xl sm:text-6xl font-black tracking-tighter tabular-nums">{roi < 0 ? '−' : ''}{Math.abs(roi)}%</p>
                </div>
              </div>
            </div>

            <div className="bg-brand-white/5 border border-brand-white/10 rounded-3xl p-6 md:p-8">
              <h4 className="text-brand-white font-bold uppercase tracking-widest text-sm mb-4">Recognition Level</h4>
              <div className="flex justify-between items-end gap-3 mb-2">
                <p className={`font-bold text-lg ${tier.color}`}>{tier.name} Partner</p>
                {next && <p className="text-brand-gray text-xs text-right"><strong className="text-brand-white font-bold">{fmtPrice(Math.round(next.min - eff))}</strong> to {next.name} Partner</p>}
              </div>
              <div className="w-full bg-brand-dark border border-brand-white/10 rounded-full h-3 mb-6 overflow-hidden">
                <div className="bg-brand-yellow h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
              </div>
              <div className="grid grid-cols-4 gap-1 text-[10px] sm:text-xs">
                {TIERS.map((t, i) => (
                  <div key={t.name} className={`text-center ${i <= reachedIdx ? 'text-brand-yellow font-bold' : 'text-brand-gray/60'}`}>
                    <div className={`h-1 w-full mb-1 rounded-full ${i <= reachedIdx ? 'bg-brand-yellow' : 'bg-brand-white/10'}`} />
                    {t.name}
                    <div className="opacity-70 tracking-tighter">{t.min === 0 ? '<30k' : `${t.min / 1000}k`}</div>
                  </div>
                ))}
              </div>
              {has && <PlanLeadLine total={eff} className="mt-5" />}
            </div>

            <a href={buildMailto(cart, rebooking)}
              className="w-full py-4 px-4 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 text-center bg-brand-yellow text-brand-dark hover:brightness-110 transition">
              <Mail className="w-4 h-4 shrink-0" aria-hidden /> {has ? 'Enquire About Your Selection' : 'Ready to discuss your package?'}
            </a>
            <p className="text-center text-xs text-brand-gray -mt-3">{has ? `${cart.length} product${cart.length === 1 ? '' : 's'} pre-filled in your email` : 'Contact the partnerships team today'}</p>
            <button type="button" onClick={() => (has ? downloadProposalPDF(cart, rebooking) : null)} aria-disabled={!has}
              className={`w-full py-4 px-4 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-colors ${has ? 'bg-brand-white/10 text-brand-white hover:bg-brand-white/20' : 'bg-brand-white/5 text-brand-gray/60 cursor-not-allowed'}`}>
              <Download className="w-4 h-4 shrink-0" aria-hidden /> {has ? 'Download PDF Proposal' : 'Add products to download the PDF'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Calculator panel ───────────────────────────────────────────────────────
function CalculatorPanel({ cart, onRemove, rebooking, setRebooking, open, setOpen, onJump }) {
  const total = cart.reduce((s, i) => s + (i.poa ? 0 : (rebooking ? Math.round(i.price * 0.85) : i.price)), 0)
  const tier = resolveTier(total, cart)
  const next = nextSpendTier(total, cart)
  const closeRef = useRef(null)
  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])
  return (
    <>
      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-brand-dark/95 backdrop-blur-md border-t border-brand-yellow/30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <TierProgress total={total} cart={cart} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Calculator className="hidden sm:block w-5 h-5 text-brand-yellow shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-brand-gray font-bold truncate"><span className="hidden sm:inline">Your Selection · </span>{cart.length} item{cart.length === 1 ? '' : 's'}</p>
              <p className="font-black text-brand-white text-base sm:text-lg leading-tight truncate tabular-nums">
                {fmtPrice(total)} <span className={`text-xs font-bold uppercase ${tier.color}`}>· {tier.name}<span className="hidden sm:inline"> Partner</span></span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => setOpen(!open)}
              className="h-10 px-3.5 sm:px-4 rounded-xl border border-brand-white/20 text-brand-white text-xs font-bold uppercase tracking-widest hover:border-brand-yellow transition-colors">
              {open ? 'Close' : 'Review'}
            </button>
            <a href="#roi-calculator" onClick={(e) => { setOpen(false); onJump(e, 'roi-calculator') }} title="The ROI calculator"
              className="hidden min-[400px]:inline-flex h-10 items-center px-3 sm:px-4 rounded-xl border border-brand-white/20 text-brand-white text-xs font-bold uppercase tracking-widest hover:border-brand-yellow transition-colors">
              ROI
            </a>
            <a href={buildMailto(cart, rebooking)}
              className="h-10 px-3.5 sm:px-4 rounded-xl bg-brand-yellow text-brand-dark text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all inline-flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" aria-hidden /> Enquire
            </a>
          </div>
        </div>
      </div>

      {/* Slide-over */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Investment calculator">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md bg-brand-dark border-l border-brand-white/10 h-full overflow-y-auto p-5 sm:p-6 pb-40">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-brand-white uppercase">Investment Calculator</h3>
              <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="w-10 h-10 -mr-2 shrink-0 flex items-center justify-center rounded-full text-brand-gray hover:text-brand-white" aria-label="Close calculator"><X className="w-6 h-6" /></button>
            </div>
            <label className="flex items-center gap-3 bg-brand-white/5 border border-brand-white/10 rounded-xl px-4 py-3 mb-6 cursor-pointer">
              <input type="checkbox" checked={rebooking} onChange={(e) => setRebooking(e.target.checked)}
                className="w-4 h-4 accent-[#ffcf33]" />
              <span className="text-sm text-brand-white">
                2026 partner rebooking rate <strong className="text-brand-yellow">(-15%)</strong>
                <span className="block text-xs text-brand-gray mt-0.5">Available to returning 2026 partners when confirmed within one month of the previous edition. Not combinable with other offers.</span>
              </span>
            </label>
            {cart.length === 0 ? (
              <p className="text-brand-gray text-sm">Nothing selected yet. Add packages from the rate card below.</p>
            ) : (
              <ul className="space-y-3 mb-6">
                {cart.map((item, idx) => (
                  <li key={idx} className="flex items-start justify-between gap-3 bg-brand-white/5 border border-brand-white/10 rounded-xl pl-4 pr-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-brand-white leading-snug">{item.title}</p>
                      <p className="text-xs text-brand-gray mt-0.5">{item.cat}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-brand-yellow tabular-nums">{item.poa ? 'POA' : fmtPrice(rebooking ? Math.round(item.price * 0.85) : item.price)}</p>
                      <button type="button" onClick={() => onRemove(idx)} className="min-h-8 text-[10px] uppercase tracking-widest text-brand-gray hover:text-brand-white font-bold">Remove</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t border-brand-white/10 pt-4 space-y-1 mb-6">
              <div className="flex justify-between text-sm text-brand-gray"><span>Recognition level</span><span className={`font-black uppercase ${tier.color}`}>{tier.name} Partner</span></div>
              {next && <div className="flex justify-between text-xs text-brand-gray/70"><span>Next level</span><span>{fmtPrice(next.min - total)} to {next.name}</span></div>}
              {cart.length > 0 && <PlanLeadLine total={total} className="pt-1 text-xs" />}
              <div className="flex justify-between text-lg font-black text-brand-white pt-2"><span>Total</span><span className="text-brand-yellow tabular-nums">{fmtPrice(total)}</span></div>
            </div>
            <div className="space-y-3">
              <a href={buildMailto(cart, rebooking)}
                className="w-full py-3.5 rounded-xl bg-brand-yellow text-brand-dark font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all">
                <Mail className="w-4 h-4" aria-hidden /> Contact Sales
              </a>
              <button type="button" onClick={() => downloadProposalPDF(cart, rebooking)} disabled={!cart.length}
                className={`w-full py-3.5 rounded-xl border font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all ${cart.length ? 'border-brand-yellow/50 text-brand-yellow hover:bg-brand-yellow/10' : 'border-brand-white/10 text-brand-gray cursor-not-allowed'}`}>
                <Download className="w-4 h-4" aria-hidden /> Download Proposal PDF
              </button>
              <CopyLinkButton text={() => planLink(cart)} disabled={!cart.length}
                label="Copy plan link" done="Plan link copied" title="Copy a link that opens this selection"
                look="w-full py-3.5 rounded-xl border font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2"
                className={cart.length ? 'border-brand-white/20 text-brand-white hover:border-brand-yellow hover:text-brand-yellow' : 'border-brand-white/10 text-brand-gray'} />
              {cart.length > 0 && <p className="text-center text-xs text-brand-gray">The link opens this page with the same selection.</p>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Present mode: the deck ─────────────────────────────────────────────────
// Built from the page's own data every time it opens, so a product added to
// `pricing` (or a family, a route pair, a status) appears here with no edit:
//   cover → why partner → who's in the room → for each family in CARDS order,
//   a family slide then one slide per card → delegate tickets → ticket offers →
//   recognition → your selection (only while the calculator has items) → next
//   steps.
// A goal deck ("Present these" on a goal chip) is the cover, the families with
// a matching product, those products and next steps.
// Slide ids are the page's own anchors, so a card link and its slide agree:
// cards p-<slug>, families the family slug, and about / audience / tickets /
// recognition. `?present=` also accepts a route's own anchor (the two-route
// slide, with that route marked) and a ticket row's t-<slug> (the ladder slide,
// with that row lit).
const CARD_OF = Object.fromEntries(CARDS.flatMap(({ cards }) => cards.flatMap((c) => c.options.map((o) => [o.id, c]))))
const ROUTE_ANCHOR = Object.fromEntries(CARDS.flatMap(({ cards }) => cards.filter((c) => c.options.length > 1)
  .flatMap((c) => c.options.map((o) => [productId(o), c]))))

function buildDeck({ lens = null, hasPlan = false }) {
  const groups = CARDS
    .map(({ cat, cards }) => ({ cat, cards: lens ? cards.filter((c) => cardHasLens(c, lens)) : cards }))
    .filter((g) => g.cards.length)
  const slides = [{ id: 'cover', kind: 'cover', label: 'Cover', group: 'Start', groups }]
  if (!lens) {
    // the page's order: the proof band, then where to start
    slides.push({ id: 'audience', kind: 'audience', label: "Who's in the room", group: 'Start' })
    slides.push({ id: 'about', kind: 'about', label: 'Why partner', group: 'Start' })
    slides.push({ id: 'start', kind: 'ways', label: 'Where to start', group: 'Start' })
  }
  groups.forEach(({ cat, cards }) => {
    slides.push({ id: catId(cat), kind: 'family', label: cat, group: cat, cat, cards })
    cards.forEach((card) => slides.push({ id: productId(card), kind: card.options.length > 1 ? 'routes' : 'product', label: card.title, group: cat, cat, card }))
  })
  if (!lens) {
    slides.push({ id: 'tickets', kind: 'tickets', label: 'Delegate tickets', group: 'Tickets' })
    slides.push({ id: 'ticket-offers', kind: 'ticket-offers', label: 'Ticket offers', group: 'Tickets' })
    slides.push({ id: 'recognition', kind: 'recognition', label: 'Recognition levels', group: 'Recognition' })
    if (hasPlan) slides.push({ id: 'plan', kind: 'plan', label: 'Your selection', group: 'Your selection' })
  }
  slides.push({ id: 'next-steps', kind: 'next', label: 'Next steps', group: 'Next steps' })
  return slides
}
// the first family slide of a lens deck, where "Present these" opens it
const lensStart = (lens) => {
  const g = CARDS.find(({ cards }) => cards.some((c) => cardHasLens(c, lens)))
  return g ? catId(g.cat) : ''
}

// what a ?present= value opens: the slide, plus a route or ticket row to mark
function deckStart(requested, slides) {
  if (requested && slides.some((s) => s.id === requested)) return { id: requested }
  if (requested && ROUTE_ANCHOR[requested]) return { id: productId(ROUTE_ANCHOR[requested]), route: requested }
  if (requested && ticketLadder.some((t) => ticketId(t) === requested)) return { id: 'tickets', ticket: requested }
  return { id: slides[0]?.id }
}

const DECK_BTN = 'inline-flex items-center justify-center gap-2 min-h-11 rounded-full border border-brand-white/15 px-4 sm:px-5 text-sm font-bold text-brand-white hover:border-brand-yellow/60 hover:text-brand-yellow transition-colors'
const DECK_BTN_PRIMARY = 'inline-flex items-center justify-center gap-2 min-h-11 rounded-full bg-brand-yellow px-5 text-sm font-black text-brand-dark hover:brightness-110 transition'
const DECK_QUIET = 'inline-flex items-center gap-1.5 min-h-11 rounded-full px-3 text-sm font-bold'
const DECK_QUIET_TONE = 'text-brand-gray hover:text-brand-yellow hover:bg-brand-white/[0.06] transition-colors'

function SlideEyebrow({ children, className = '' }) {
  return <p className={`text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] text-brand-yellow ${className}`}>{children}</p>
}

// the card's corner badge, as a pill: featured, exclusive, N available, or the
// status once sold or reserved
function StatusPill({ item, featured = false }) {
  const label = availLabel(item)
  const out = isOut(item)
  if (!label && !featured) return null
  const tone = item.status === 'sold' ? 'bg-brand-white/15 text-brand-white'
    : item.status === 'reserved' ? 'bg-brand-yellow/15 text-brand-yellow'
      : featured ? 'bg-brand-yellow text-brand-dark' : 'bg-brand-white/10 text-brand-gray'
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${tone}`}>{featured && !out ? `✦ ${label || 'Featured'}` : label}</span>
}

// every deliverable, always (never "+ N more"): a long list sets smaller
function SlideDeliverables({ items, heading = 'What’s included', small = false, cols = false, className = '' }) {
  if (!items.length) return null
  const shown = items
  small = small || items.length > 7
  return (
    <div className={className}>
      <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-brand-gray mb-3">{heading}</p>
      <ul className={cols ? 'grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2' : small ? 'space-y-2' : 'space-y-2.5'}>
        {shown.map((line, i) => (
          <li key={i} className={`flex items-start gap-3 leading-relaxed ${small ? 'text-sm text-brand-white/80' : 'text-[15px] text-brand-white/85'}`}>
            <CircleCheck className={`w-4 h-4 shrink-0 text-brand-yellow ${small ? 'mt-0.5' : 'mt-1'}`} aria-hidden />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// The hero, then the whole deck as a table of contents: each family (by the
// short name its family-bar chip uses) with its product count, each a jump.
function CoverSlide({ slide, deck, goId }) {
  const { lens, cart } = deck
  const n = slide.groups.reduce((s, g) => s + g.cards.length, 0)
  const plural = (k, one) => `${k} ${one}${k === 1 ? '' : 's'}`
  const items = [
    ...(lens ? [] : [{ id: 'audience', label: "Who's in the room", icon: Users }, { id: 'start', label: 'Where to start', icon: Target }]),
    ...slide.groups.map(({ cat, cards }) => ({ id: catId(cat), label: FAMILY_META[cat]?.short || cat, icon: FAMILY_META[cat]?.icon || Layers, count: plural(cards.length, 'product') })),
    ...(lens ? [] : [
      { id: 'tickets', label: 'Tickets', icon: Ticket, count: plural(ticketLadder.length, 'ticket') },
      { id: 'recognition', label: 'Recognition', icon: Award, count: plural(RECOGNITION.length, 'level') },
      ...(cart.length ? [{ id: 'plan', label: 'Your selection', icon: Calculator, count: plural(cart.length, 'item') }] : []),
    ]),
    { id: 'next-steps', label: 'Next steps', icon: ArrowRight },
  ]
  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-12 items-end">
        <div className="lg:col-span-8">
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-yellow/30 bg-brand-yellow/10 text-brand-yellow text-[11px] sm:text-xs font-bold uppercase tracking-[0.18em]">
            <TrendingUp className="w-3.5 h-3.5 shrink-0" aria-hidden /> The Prediction Markets Summit
          </p>
          <h2 className="mt-5 text-[clamp(3rem,12vw,5.75rem)] font-black tracking-tighter leading-none"><Brand /></h2>
          <div className="mt-4 inline-block max-w-full rounded-xl bg-brand-yellow px-5 py-2.5 -skew-x-6">
            <p className="skew-x-6 text-[clamp(1.1rem,4.4vw,2rem)] font-black uppercase tracking-tighter leading-none text-brand-dark whitespace-nowrap">Partnership Rate Card</p>
          </div>
          {lens && <p className="mt-5 text-2xl sm:text-3xl font-black leading-tight">{lensLine(lens, n)}</p>}
          <p className="mt-5 flex items-start gap-2 text-base sm:text-lg text-brand-white/85">
            <MapPin className="w-5 h-5 mt-0.5 shrink-0 text-brand-yellow" aria-hidden />{VENUE_LINE}
          </p>
        </div>
        {!lens && (
          <dl className="lg:col-span-4 grid grid-cols-2 gap-2.5 sm:gap-3">
            {EVENT_STATS.map(([num, label]) => (
              <div key={label} className="flex flex-col-reverse rounded-xl border border-brand-white/10 bg-brand-white/5 px-4 py-3">
                <dt className="mt-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-brand-gray leading-snug">{label}</dt>
                <dd className="text-3xl font-black leading-none tabular-nums">{num}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <nav aria-label="In this presentation" className="mt-7 lg:mt-9 border-t border-brand-white/10 pt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 mb-2">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-gray">In this presentation</p>
          <p className="text-xs sm:text-sm text-brand-gray">Use the arrow keys, or swipe</p>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6">
          {items.map(({ id, label, icon: Icon, count }) => (
            <li key={id}>
              <button type="button" onClick={() => goId(id)}
                className="group/i -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 min-h-10 py-1 text-left hover:bg-brand-white/[0.06] transition-colors">
                <Icon className="w-4 h-4 shrink-0 text-brand-yellow" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-brand-white/90 group-hover/i:text-brand-yellow transition-colors">{label}</span>
                {count && <span className="shrink-0 text-xs tabular-nums text-brand-gray">{count}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

function AboutSlide() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
      <div className="lg:col-span-7">
        <SlideEyebrow>Why partner</SlideEyebrow>
        <h2 className="mt-4 text-4xl sm:text-5xl xl:text-6xl font-black leading-[1.04] tracking-tight text-balance">{WHY_PARTNER.title} <span className="text-brand-yellow">{WHY_PARTNER.accent}</span></h2>
        <p className="mt-6 text-lg sm:text-xl leading-relaxed text-brand-white/80">{WHY_PARTNER.body}</p>
      </div>
      <div className="lg:col-span-5">
        <p className="text-base sm:text-lg leading-relaxed text-brand-gray">{WHY_PARTNER.npsIntro}</p>
        <NpsTiles side big className="mt-5" />
        <p className="mt-4 text-xs leading-relaxed text-brand-gray/80">{NPS_SOURCE}</p>
      </div>
    </div>
  )
}

// The proof band as a slide: the 2026 room, its press, the registered
// companies and this year's partners, with their labels.
function AudienceSlide() {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <SlideEyebrow>The room</SlideEyebrow>
        <p className="text-xs sm:text-sm text-brand-gray">{ROOM_LABEL}</p>
      </div>
      <h2 className="mt-3 text-4xl sm:text-5xl font-black uppercase tracking-tight leading-[1.05]">Who&rsquo;s In <span className="text-brand-yellow">The Room</span></h2>
      <dl className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {ROOM_FIGURES.map(([num, label]) => (
          <div key={label} className="flex flex-col-reverse rounded-xl border border-brand-white/10 bg-brand-white/5 px-4 py-3.5">
            <dt className="mt-1.5 text-[10.5px] sm:text-[11px] font-bold uppercase tracking-widest text-brand-white/75 leading-snug">{label}</dt>
            <dd className="text-4xl sm:text-5xl font-black leading-none tabular-nums text-brand-yellow">{num}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[9.5rem_minmax(0,1fr)] items-center gap-x-6 gap-y-3 lg:gap-y-5">
        <p className={LABEL}>Accredited press</p>
        <LogoRow logos={PRESS_LOGOS} area={1900} max={26} />
        <p className={LABEL}>Registered for 2026</p>
        <LogoRow logos={REGISTERED_LOGOS} area={1500} max={24} className="gap-x-7 sm:gap-x-8 gap-y-3.5" />
        <p className={LABEL}>2026 partners</p>
        <LogoRow logos={PARTNER_LOGOS} area={1900} max={26} />
      </div>
      <p className="mt-6 text-[11px] leading-relaxed text-brand-gray">{ROOM_SOURCE} {LOGOS_NOTE}</p>
    </div>
  )
}

// Where to start: the page's four ways in. "Present these" turns the deck into
// that way's deck, on its first family.
function WaysSlide({ deck }) {
  return (
    <div>
      <SlideEyebrow>Where to start</SlideEyebrow>
      <h2 className="mt-3 text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight leading-[1.03]">Four ways <span className="text-brand-yellow">in</span></h2>
      <p className="mt-4 max-w-3xl text-lg sm:text-xl leading-relaxed text-brand-white/80">Pick what you want from the event, and the presentation shows just those products.</p>
      <ul className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {WAYS.map((w) => {
          const Icon = w.icon
          const from = wayFrom(w)
          const n = lensCount({ kind: 'way', key: w.key })
          return (
            <li key={w.key} className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-brand-white/12 bg-brand-white/[0.04] p-4 sm:p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-yellow/15 text-brand-yellow"><Icon className="h-6 w-6" aria-hidden /></span>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-black leading-tight">{w.title}</p>
                <p className="mt-1 text-sm leading-snug text-brand-gray">{w.line}</p>
                <p className="mt-1.5 text-sm font-bold tabular-nums text-brand-white/90">{from !== null && <><span className="font-medium text-brand-gray">from </span>{fmtPrice(from)} · </>}{n} products</p>
              </div>
              <button type="button" onClick={() => deck.presentLens({ kind: 'way', key: w.key })} className={DECK_BTN_PRIMARY}>
                <Presentation className="w-4 h-4" aria-hidden /> Present these
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function FamilySlide({ slide, goId, deck }) {
  const Icon = FAMILY_META[slide.cat]?.icon || Layers
  const n = slide.cards.length
  const from = familyFrom(slide.cards)
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
      <div className="lg:col-span-5">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-yellow/15 text-brand-yellow"><Icon className="w-7 h-7" aria-hidden /></span>
        <SlideEyebrow className="mt-6">{deck.lens ? `For ${lensLabel(deck.lens)}` : 'Product family'}</SlideEyebrow>
        <h2 className="mt-3 text-4xl sm:text-5xl xl:text-6xl font-black uppercase leading-[1.02] tracking-tight text-balance">{slide.cat.replace(/-/g, '‑')}</h2>
        <p className="mt-5 text-lg sm:text-xl text-brand-gray">
          <strong className="font-black text-brand-white">{n} product{n === 1 ? '' : 's'}</strong>
          {from && <> · <span className="text-brand-white">{from}</span></>}
        </p>
        {FAMILY_BRIEFS[slide.cat] && <p className="mt-4 text-base sm:text-lg leading-relaxed text-brand-white/75">{FAMILY_BRIEFS[slide.cat].text}</p>}
      </div>
      <ul className="lg:col-span-7 divide-y divide-brand-white/10 rounded-2xl border border-brand-white/10 bg-brand-white/[0.03] px-2 sm:px-4">
        {slide.cards.map((card) => {
          const price = menuPrice(card)
          return (
            <li key={card.key}>
              <button type="button" onClick={() => goId(productId(card))}
                className="group/p flex w-full items-center gap-3 min-h-14 px-2 py-3 text-left">
                <span className="min-w-0 flex-1 text-base sm:text-lg font-bold leading-snug text-brand-white group-hover/p:text-brand-yellow transition-colors">
                  {card.title}
                  {card.options.length > 1 && <span className="ml-2 align-middle text-[10px] font-black uppercase tracking-widest text-brand-gray">{card.options.length} routes</span>}
                </span>
                <span className={`shrink-0 whitespace-nowrap tabular-nums ${price.out ? 'text-xs font-bold uppercase tracking-wider text-brand-gray' : 'text-base sm:text-lg font-black text-brand-yellow'}`}>
                  {price.from && <span className="mr-1 text-xs font-medium text-brand-gray">from</span>}{price.text}
                </span>
                <ChevronRight className="w-5 h-5 shrink-0 text-brand-gray group-hover/p:text-brand-yellow transition-colors" aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// either/or partners that sit on another card (the Nourish Bars pair): a slide
// links to the alternative
function alternativesOf(card) {
  const own = new Set(card.options.map((o) => o.id))
  const seen = new Set()
  return card.options.flatMap((o) => CONFLICTS[o.id] || [])
    .filter((id) => !own.has(id) && CARD_OF[id])
    .map((id) => CARD_OF[id])
    .filter((c) => (seen.has(c.key) ? false : seen.add(c.key)))
}
function AltLinks({ card, deck, goId }) {
  const alts = alternativesOf(card).filter((c) => deck.hasSlide(productId(c)))
  if (!alts.length) return null
  return (
    <p className="mt-5 flex flex-wrap items-center gap-x-2 text-sm text-brand-gray">
      Either/or with
      {alts.map((c) => (
        <button key={c.key} type="button" onClick={() => goId(productId(c))}
          className="inline-flex items-center gap-1 min-h-11 font-bold text-brand-white underline decoration-brand-yellow/60 underline-offset-4 hover:text-brand-yellow transition-colors">
          {c.title} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
        </button>
      ))}
    </p>
  )
}

function ProductSlide({ card, deck, goId }) {
  const item = card.options[0]
  const { items, terms } = splitBullets(item.bullets)
  const id = productId(card)
  // a long list gets the wider column, in two columns, so every line still
  // shows and the slide stays closer to one screen
  const long = items.length > 9
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 ${long ? 'lg:gap-10' : 'lg:gap-14'} items-start`}>
      <div className={long ? 'lg:col-span-5' : 'lg:col-span-7'}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <SlideEyebrow>{card.cat}</SlideEyebrow>
          <StatusPill item={item} featured={card.featured} />
        </div>
        <h2 className={`mt-3 sm:mt-4 font-black leading-[1.03] tracking-tight text-balance ${long ? 'text-4xl' : card.title.length > 30 ? 'text-4xl sm:text-[2.75rem]' : 'text-4xl sm:text-5xl xl:text-[3.5rem]'}`}>{card.title}</h2>
        <div className="mt-5 sm:mt-6"><PriceBlock item={item} rebooking={deck.rebooking} scale="slide" /></div>
        <Lede text={item.quote} scale="slide" />
        <TagRow item={item} featured />
        <div className="mt-7 flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="w-full sm:w-auto sm:min-w-[17rem]">
            <AddButton item={item} count={deck.cartCounts[item.id] || 0} conflicted={deck.conflictedIds.has(item.id)} onAdd={deck.onAdd} featured />
          </div>
          <button type="button" onClick={() => deck.openCard(id)} className={DECK_BTN}>Open the card <ArrowRight className="w-4 h-4" aria-hidden /></button>
          <CopyLinkButton id={id} look={DECK_QUIET} className={DECK_QUIET_TONE} />
        </div>
        <AltLinks card={card} deck={deck} goId={goId} />
      </div>
      <div className={long ? 'lg:col-span-7' : 'lg:col-span-5'}>
        <ReachRow item={item} className="mb-4" />
        <SlideDeliverables items={items} cols={long} />
        <TermsList terms={terms} />
      </div>
    </div>
  )
}

// A two-route card (exclusive or shared, turnkey or space only) is one slide.
// Each route keeps its own panel: price, add button, lede, the lines only that
// route carries, and its own terms. What both routes carry word for word -
// deliverables, terms, and the lede when it is the same - is listed once, so
// the difference between the routes is what the panels show. Every line is the
// card's own.
const sameTerm = (a, b) => a.kind === b.kind && a.text === b.text
// the copy-link icon a route panel carries beside its add button
const ROUTE_COPY = 'inline-flex shrink-0 items-center justify-center w-12 h-12 rounded-xl border border-brand-white/15 [&>span]:sr-only'
function RouteSlide({ card, deck, goId }) {
  const routes = card.options.map((o) => ({ o, ...splitBullets(o.bullets) }))
  const common = routes[0].items.filter((l) => routes.every((r) => r.items.includes(l)))
  const commonTerms = routes[0].terms.filter((t) => routes.every((r) => r.terms.some((u) => sameTerm(t, u))))
  const lede = stripQuotes(routes[0].o.quote)
  const sharedLede = routes.every((r) => stripQuotes(r.o.quote) === lede) ? routes[0].o.quote : null
  // the value row too: shown once, across both panels, when every route has the same
  const reachKey = (o) => JSON.stringify(reachFor(o))
  const sharedReach = routes.every((r) => reachKey(r.o) === reachKey(routes[0].o))
  const openId = deck.focusRoute || productId(card)
  // Little shared (no shared terms, at most three shared lines): the panels
  // take the full width, price and add button share a row, and the shared
  // lines run in a strip under the panels. Otherwise the shared lines and
  // terms get their own column beside the panels.
  const wide = commonTerms.length === 0 && common.length <= 3
  const side = !wide && (common.length > 0 || commonTerms.length > 0)
  // a side column of shared lines only (no terms) is short: it takes a quarter
  const narrowSide = side && commonTerms.length === 0
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <SlideEyebrow>{card.cat}</SlideEyebrow>
        <span className="inline-flex items-center rounded-full bg-brand-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-brand-gray whitespace-nowrap">{routes.length} routes · choose one</span>
        <button type="button" onClick={() => deck.openCard(openId)} className={`${DECK_QUIET} ${DECK_QUIET_TONE} sm:ml-auto -my-2`}>Open the card <ArrowRight className="w-4 h-4" aria-hidden /></button>
      </div>
      <h2 className="mt-3 text-3xl sm:text-4xl font-black leading-[1.05] tracking-tight text-balance">{card.title}</h2>
      {sharedLede && <div className="mt-4 max-w-4xl [&>p]:mb-0"><Lede text={sharedLede} featured /></div>}
      <div className="mt-5 grid grid-cols-1 xl:grid-cols-12 gap-5 xl:gap-8 items-start">
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${side ? (narrowSide ? 'xl:col-span-9' : 'xl:col-span-8') : 'xl:col-span-12'}`}>
          {sharedReach && <ReachRow item={routes[0].o} className="md:col-span-2" />}
          {routes.map(({ o, items, terms }) => {
            const label = routeLabel(card, o)
            const marked = deck.focusRoute === productId(o)
            return (
              <div key={o.id} className={`flex flex-col rounded-2xl border p-4 sm:p-5 ${marked ? 'border-brand-yellow bg-brand-yellow/[0.08] shadow-[inset_0_0_0_1px_#ffcf33]' : 'border-brand-white/12 bg-brand-white/[0.04]'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-brand-yellow">{label}</p>
                  <StatusPill item={o} />
                </div>
                <div className={wide ? 'mb-5 flex flex-wrap items-center justify-between gap-x-4 [&>:first-child]:mb-0' : ''}>
                  <PriceBlock item={o} rebooking={deck.rebooking} scale="route" />
                  <div className={`flex items-center gap-2 ${wide ? 'mt-2 flex-1 min-w-[15rem] xl:max-w-[18rem]' : '-mt-1 mb-5'}`}>
                    <div className="min-w-0 flex-1">
                      <AddButton item={o} count={deck.cartCounts[o.id] || 0} conflicted={deck.conflictedIds.has(o.id)} onAdd={deck.onAdd} featured />
                    </div>
                    <CopyLinkButton id={productId(o)} title={`Copy a link to the ${label} route`} look={ROUTE_COPY} className="text-brand-gray hover:text-brand-yellow hover:border-brand-yellow/60" />
                  </div>
                </div>
                {!sharedLede && <Lede text={o.quote} />}
                {!sharedReach && <ReachRow item={o} className="mb-4" />}
                <SlideDeliverables items={items.filter((l) => !common.includes(l))} heading="Only on this route" small />
                <TermsList terms={terms.filter((t) => !commonTerms.some((c) => sameTerm(c, t)))} />
              </div>
            )
          })}
        </div>
        {side && (
          <div className={`${narrowSide ? 'xl:col-span-3' : 'xl:col-span-4'} xl:pt-1`}>
            <SlideDeliverables items={common} heading="Both routes include" small />
            <TermsList terms={commonTerms} />
          </div>
        )}
      </div>
      {wide && <SlideDeliverables items={common} heading="Both routes include" small cols className="mt-5" />}
      <AltLinks card={card} deck={deck} goId={goId} />
    </div>
  )
}

function TicketsSlide({ deck }) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <SlideEyebrow>Delegate tickets · USD</SlideEyebrow>
          <h2 className="mt-3 text-4xl sm:text-5xl font-black uppercase tracking-tight leading-[1.05]">Delegate <span className="text-brand-yellow">Tickets</span></h2>
        </div>
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <button type="button" onClick={() => deck.openCard('tickets')} className={DECK_BTN}>Open the tickets <ArrowRight className="w-4 h-4" aria-hidden /></button>
          <CopyLinkButton id="tickets" title="Copy a link to the ticket prices" look={DECK_QUIET} className={DECK_QUIET_TONE} />
        </div>
      </div>
      <TicketStages className="mt-4 max-w-5xl text-base leading-relaxed text-brand-gray" />
      <TicketLadder anchors={false} highlight={deck.focusTicket} className="mt-6" />
      <p className="mt-4 text-xs leading-relaxed text-brand-gray">{TICKET_FOOTNOTE}</p>
    </div>
  )
}

function TicketOffersSlide() {
  return (
    <div>
      <SlideEyebrow>Delegate tickets</SlideEyebrow>
      <h2 className="mt-3 text-4xl sm:text-5xl font-black uppercase tracking-tight leading-[1.05]">Ticket <span className="text-brand-yellow">Offers</span></h2>
      <TicketOffers className="mt-8" />
    </div>
  )
}

function RecognitionSlide({ deck }) {
  const total = planTotal(deck.cart, deck.rebooking)
  const reached = deck.cart.length ? resolveTier(total, deck.cart).name : null
  return (
    <div>
      <SlideEyebrow>Recognition</SlideEyebrow>
      <h2 className="mt-3 text-4xl sm:text-5xl font-black uppercase tracking-tight leading-[1.05]">Partner <span className="text-brand-yellow">Recognition</span></h2>
      <p className="mt-4 max-w-3xl text-lg sm:text-xl leading-relaxed text-brand-white/80">{RECOGNITION_LEDE}</p>
      <RecognitionLevels reached={reached} className="mt-8" />
      <p className="mt-6 text-xs leading-relaxed text-brand-gray">{RECOGNITION_NOTE}</p>
    </div>
  )
}

function PlanSlide({ deck }) {
  const { cart, rebooking } = deck
  const total = planTotal(cart, rebooking)
  const tier = resolveTier(total, cart)
  const next = nextSpendTier(total, cart)
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
      <div className="lg:col-span-5">
        <SlideEyebrow>Your selection · {cart.length} item{cart.length === 1 ? '' : 's'}</SlideEyebrow>
        <h2 className="mt-3 text-5xl sm:text-6xl font-black tabular-nums leading-none text-brand-yellow">{fmtPrice(total)}</h2>
        <p className="mt-4 text-lg">
          <span className={`font-black uppercase ${tier.color}`}>{tier.name} Partner</span>
          {next && <span className="text-brand-gray"> · {fmtPrice(next.min - total)} to {next.name}</span>}
        </p>
        <div className="mt-4 rounded-xl border border-brand-white/10 bg-brand-white/[0.03] py-2"><TierProgress total={total} cart={cart} /></div>
        <PlanLeadLine total={total} className="mt-3" />
        <p className="mt-3 text-xs text-brand-gray">
          {rebooking ? <span className="font-semibold uppercase tracking-wide text-brand-yellow/80">15% rebooking rate applied · </span> : null}
          Prices in EUR, excluding VAT
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-2 sm:gap-3">
          <a href={buildMailto(cart, rebooking)} className={DECK_BTN_PRIMARY}><Mail className="w-4 h-4" aria-hidden /> Email this selection</a>
          <button type="button" onClick={() => downloadProposalPDF(cart, rebooking)} className={DECK_BTN}><Download className="w-4 h-4" aria-hidden /> Proposal PDF</button>
          <CopyLinkButton text={() => planLink(cart)} label="Copy plan link" done="Plan link copied" title="Copy a link that opens this selection" look={DECK_QUIET} className={DECK_QUIET_TONE} />
        </div>
      </div>
      <ul className="lg:col-span-7 divide-y divide-brand-white/10 rounded-2xl border border-brand-white/10 bg-brand-white/[0.03]">
        {cart.map((item, idx) => (
          <li key={idx} className="flex items-start justify-between gap-4 px-4 sm:px-5 py-3">
            <div className="min-w-0">
              <p className="font-bold leading-snug">{item.title}</p>
              <p className="mt-0.5 text-xs text-brand-gray">{item.cat}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-black tabular-nums text-brand-yellow">{item.poa ? 'POA' : fmtPrice(rebooking ? Math.round(item.price * 0.85) : item.price)}</p>
              <button type="button" onClick={() => deck.onRemove(idx)} className="-my-1 min-h-11 text-[11px] font-bold uppercase tracking-widest text-brand-gray hover:text-brand-white">Remove</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function NextStepsSlide({ deck, goId }) {
  const { cart, rebooking } = deck
  const has = cart.length > 0
  const steps = [
    { icon: Calculator, title: 'Build your selection',
      body: 'Add products as we go with Add to Calculator. The calculator totals them and shows the recognition level they reach.',
      actions: has && <button type="button" onClick={() => (deck.hasSlide('plan') ? goId('plan') : deck.openCalculator())} className={DECK_BTN}><ListChecks className="w-4 h-4" aria-hidden /> Review your selection ({cart.length})</button> },
    { icon: Download, title: 'Take the rate card with you',
      body: has ? 'The full rate card as a PDF, and a proposal PDF of your selection with its total and recognition level.' : 'The full rate card as a PDF: every product, its price and its terms.',
      actions: <>
        <button type="button" onClick={downloadRateCardPDF} className={DECK_BTN}><Download className="w-4 h-4" aria-hidden /> Full rate card PDF</button>
        {has && <button type="button" onClick={() => downloadProposalPDF(cart, rebooking)} className={DECK_BTN}><Download className="w-4 h-4" aria-hidden /> Proposal PDF</button>}
      </> },
    { icon: Mail, title: 'Talk to partnerships',
      body: has ? 'Email sales@next.io: your selection, its total and its recognition level go in the email.' : 'Email sales@next.io with the products you are interested in.',
      actions: <>
        <a href={buildMailto(cart, rebooking)} className={DECK_BTN_PRIMARY}><Mail className="w-4 h-4" aria-hidden /> Email sales@next.io</a>
        {has && <CopyLinkButton text={() => planLink(cart)} label="Copy plan link" done="Plan link copied" title="Copy a link that opens this selection" look={DECK_QUIET} className={DECK_QUIET_TONE} />}
      </> },
  ]
  return (
    <div>
      <SlideEyebrow>Next steps</SlideEyebrow>
      <h2 className="mt-3 text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight leading-[1.03]">How to <span className="text-brand-yellow">book</span></h2>
      <ol className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map(({ icon: Icon, title, body, actions }, n) => (
          <li key={title} className="flex flex-col rounded-2xl border border-brand-white/10 bg-brand-white/[0.04] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-yellow text-sm font-black text-brand-dark">{n + 1}</span>
              <Icon className="w-5 h-5 text-brand-yellow" aria-hidden />
            </div>
            <p className="mt-4 text-lg font-black leading-snug">{title}</p>
            <p className="mt-2 text-sm leading-relaxed text-brand-gray">{body}</p>
            {actions && <div className="mt-auto pt-5 flex flex-wrap items-center gap-2">{actions}</div>}
          </li>
        ))}
      </ol>
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-brand-yellow/25 bg-brand-yellow/[0.06] px-5 py-4">
        <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0 text-brand-yellow" aria-hidden />
        <p className="text-sm leading-relaxed text-brand-white/85"><strong className="font-black text-brand-yellow">2026 partners: rebook early, keep 15%. </strong>{REBOOKING_COPY}</p>
      </div>
      <p className="mt-5 text-xs sm:text-sm text-brand-gray">{VENUE_LINE} · All prices exclude VAT. Availability subject to change without notice.</p>
    </div>
  )
}

function renderDeckSlide(slide, deck, { goId }) {
  switch (slide.kind) {
    case 'cover': return <CoverSlide slide={slide} deck={deck} goId={goId} />
    case 'about': return <AboutSlide />
    case 'audience': return <AudienceSlide />
    case 'ways': return <WaysSlide deck={deck} />
    case 'family': return <FamilySlide slide={slide} deck={deck} goId={goId} />
    case 'product': return <ProductSlide card={slide.card} deck={deck} goId={goId} />
    case 'routes': return <RouteSlide card={slide.card} deck={deck} goId={goId} />
    case 'tickets': return <TicketsSlide deck={deck} />
    case 'ticket-offers': return <TicketOffersSlide />
    case 'recognition': return <RecognitionSlide deck={deck} />
    case 'plan': return <PlanSlide deck={deck} />
    case 'next': return <NextStepsSlide deck={deck} goId={goId} />
    default: return null
  }
}

// ─── App ────────────────────────────────────────────────────────────────────
// Section order (the summit through line, 29 Sep 2026): hero → proof band →
// where do I start → rate card at a glance → rate card → who's in the room
// (with why partner, #about) → tickets → recognition → ROI calculator → a
// short close. Nothing important sits below the calculator.

export default function App() {
  const [activeImpact, setActiveImpact] = useState(null)
  const [activeType, setActiveType] = useState(null)
  const [cart, setCart] = useState([])
  const [rebooking, setRebooking] = useState(false)
  const [calcOpen, setCalcOpen] = useState(false)
  // the menu's lens: a way in or a goal chip (one at a time), shared by the
  // ways in above the menu and the goal chips inside it
  const [lens, setLens] = useState(null)
  useScrollAnimation(`${activeImpact}|${activeType}`)
  useInView('.card-visual', `${activeImpact}|${activeType}`)

  const addToCart = useCallback((item) => {
    if (item.status === 'sold' || item.status === 'reserved') return
    setCart((prev) => {
      if ((CONFLICTS[item.id] || []).some((cid) => prev.some((i) => i.id === cid))) return prev
      const count = prev.filter((i) => i.id === item.id).length
      const max = item.exclusive ? 1 : (item.avail ?? Infinity)
      if (count >= max) return prev
      return [...prev, item]
    })
  }, [])
  const removeFromCart = useCallback((idx) => setCart((prev) => prev.filter((_, i) => i !== idx)), [])

  // A plan link (?plan=31,48,48) rebuilds the selection through addToCart, in
  // link order, so every cap, conflict and sold or reserved state applies;
  // unknown or refused ids drop out silently. The parameter leaves the address
  // bar straight away (so a reload or StrictMode's second run adds nothing),
  // and the calculator opens on the rebuilt selection.
  const [planRestored, setPlanRestored] = useState(false)
  useEffect(() => {
    const raw = takePlanParam()
    if (raw === null) return
    const ids = raw.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && byId[n])
    ids.forEach((id) => addToCart(byId[id]))
    if (ids.length) setPlanRestored(true)
  }, [addToCart])
  useEffect(() => {
    if (!planRestored) return
    setPlanRestored(false)
    if (cart.length) setCalcOpen(true)
  }, [planRestored, cart.length])

  const cartCounts = cart.reduce((acc, i) => { acc[i.id] = (acc[i.id] || 0) + 1; return acc }, {})
  const conflictedIds = new Set(cart.flatMap((i) => CONFLICTS[i.id] || []))

  // a card stays on the rate card while any of its routes matches the filters
  const matches = (p) => (!activeImpact || p.impact.includes(activeImpact)) && (!activeType || p.type.includes(activeType))
  const visibleGroups = CARDS
    .map(({ cat, cards }) => ({ cat, cards: cards.filter((c) => c.options.some(matches)) }))
    .filter((g) => g.cards.length > 0)
  const shownCount = visibleGroups.reduce((n, g) => n + g.cards.length, 0)
  const filtering = Boolean(activeImpact || activeType)

  // The fixed nav and the family bar change height by breakpoint; anchored
  // jumps read both from CSS variables (--nav-h, --bar-h) rather than a
  // hardcoded offset, and the scroll-spy reads the same numbers.
  const navRef = useRef(null)
  const barRef = useRef(null)
  const [dims, setDims] = useState({ nav: 72, bar: 52, vh: 900 })
  useLayoutEffect(() => {
    const root = document.documentElement
    const set = () => {
      const nav = navRef.current?.offsetHeight || 72
      const bar = barRef.current?.offsetHeight || 0
      root.style.setProperty('--nav-h', `${nav}px`)
      root.style.setProperty('--bar-h', `${bar}px`)
      const vh = window.innerHeight
      setDims((d) => (d.nav === nav && d.bar === bar && d.vh === vh ? d : { nav, bar, vh }))
    }
    set()
    const ro = new ResizeObserver(set)
    if (navRef.current) ro.observe(navRef.current)
    if (barRef.current) ro.observe(barRef.current)
    window.addEventListener('resize', set)
    return () => { ro.disconnect(); window.removeEventListener('resize', set) }
  }, [])

  // A deep link (#p-headline-partner, #exhibition, #t-vip) lands on its target.
  // React renders after the browser's own hash jump, so the jump is made here,
  // then again once late layout (web fonts) has settled - unless the reader has
  // started scrolling by then.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (!id || !document.getElementById(id)) return
    let stopped = false
    const land = () => { if (!stopped) document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' }) }
    const stop = () => { stopped = true }
    const raf = requestAnimationFrame(land)
    const t = setTimeout(land, 450)
    document.fonts?.ready.then(() => requestAnimationFrame(land))
    const evs = ['wheel', 'touchstart', 'keydown', 'mousedown']
    evs.forEach((ev) => window.addEventListener(ev, stop, { passive: true, once: true }))
    return () => { stop(); cancelAnimationFrame(raf); clearTimeout(t); evs.forEach((ev) => window.removeEventListener(ev, stop)) }
  }, [])

  // Menu, bar and nav clicks scroll in JS: a card a filter has hidden is brought
  // back first, then the page moves once it has rendered. The hash is pushed
  // like a native anchor, so Back returns to where the reader was.
  const [jumpReq, setJumpReq] = useState(null)
  const onJump = useCallback((e, id) => {
    e?.preventDefault()
    if (!document.getElementById(id)) { setActiveImpact(null); setActiveType(null) }
    setJumpReq({ id, at: Date.now() })
  }, [])
  useEffect(() => {
    if (!jumpReq) return
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(jumpReq.id)
      if (!el) return
      el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
      if (window.location.hash !== `#${jumpReq.id}`) window.history.pushState(null, '', `#${jumpReq.id}`)
      // pushState fires no hashchange, and a two-route card listens for one to
      // open on the route a link names ("Open on the card" in Present mode)
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    return () => cancelAnimationFrame(raf)
  }, [jumpReq])

  // ── Present mode ──
  // `present` is the ?present= value the deck was opened with (null = closed);
  // a lens deck (a way in or a goal chip) keeps its lens here. The page stays
  // mounted under the deck.
  const { present, open: openPresent, close: closePresent } = usePresent()
  const [deckLens, setDeckLens] = useState(null)
  const openDeck = useCallback((id = '', l = null) => { setDeckLens(l); openPresent(id) }, [openPresent])
  const closeDeck = useCallback(() => { closePresent(); setDeckLens(null) }, [closePresent])
  const hasPlan = cart.length > 0
  const slides = useMemo(() => buildDeck({ lens: deckLens, hasPlan }), [deckLens, hasPlan])
  const start = present === null ? null : deckStart(present, slides)
  const deckKey = deckLens ? `${deckLens.kind}:${deckLens.key || deckLens.value}` : 'all'
  const deck = {
    lens: deckLens, cart, rebooking, cartCounts, conflictedIds,
    focusRoute: start?.route || null, focusTicket: start?.ticket || null,
    onAdd: addToCart, onRemove: removeFromCart,
    hasSlide: (id) => slides.some((s) => s.id === id),
    // leave the deck and land on the card (or section) on the page
    openCard: (id) => { closeDeck(); onJump(null, id) },
    openCalculator: () => { closeDeck(); setCalcOpen(true) },
    // the ways slide: the deck becomes that way's deck, on its first family
    presentLens: (l) => openDeck(lensStart(l), l),
  }

  // Scroll-spy: the family whose heading has passed under the bar is the one in
  // view. The observer watches a one-pixel reading line just below the bar and
  // re-reads the family positions whenever a family - or a page section, so a
  // jump out of the rate card clears the highlight - crosses it.
  const [activeCat, setActiveCat] = useState(null)
  const catKey = visibleGroups.map((g) => g.cat).join('|')
  useEffect(() => {
    const els = (catKey ? catKey.split('|') : []).map((c) => document.getElementById(catId(c))).filter(Boolean)
    if (!els.length) { setActiveCat(null); return }
    const line = dims.nav + dims.bar + 24
    const pick = () => {
      let cur = null
      els.forEach((el) => { if (el.getBoundingClientRect().top <= line) cur = el.dataset.cat })
      setActiveCat(cur)
    }
    const io = new IntersectionObserver(pick, { rootMargin: `-${line}px 0px -${Math.max(0, dims.vh - line - 1)}px 0px`, threshold: 0 })
    els.forEach((el) => io.observe(el))
    document.querySelectorAll('main > section').forEach((el) => io.observe(el))
    pick()
    return () => io.disconnect()
  }, [catKey, dims])

  return (
    <div className="min-h-screen bg-brand-dark text-brand-white font-sans selection:bg-brand-yellow selection:text-brand-dark pb-32">

      {/* ── NAV ──
          The through line: logo left; text links Rate Card (every width),
          Calculator (md), Tickets (lg) and The Room (xl); Present, an icon
          below md and labelled from md; the Contact Sales pill, a round mail
          button below 500px. Below 380px the year steps aside. The bar fits
          one line at every width: re-measure from 320px when an item changes. */}
      <nav ref={navRef} className="fixed top-0 left-0 w-full z-40 bg-brand-dark/95 backdrop-blur-md py-3 sm:py-4 shadow-lg border-b border-brand-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex justify-between items-center gap-3">
          <a href="#" className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0 h-10">
            <img alt="NEXTPredict" className="h-6 sm:h-8 lg:h-9 w-auto object-contain" src={`${base}logos/nextpredict-logo.png`} />
            <span className="hidden min-[380px]:inline font-black text-base sm:text-xl lg:text-2xl tracking-tight text-brand-yellow">2027</span>
          </a>
          <div className="flex items-center gap-2 min-[400px]:gap-3 sm:gap-4 md:gap-5 xl:gap-7">
            <a href="#start" onClick={(e) => onJump(e, 'start')}
              className="inline-flex items-center h-10 text-xs sm:text-sm font-bold uppercase tracking-wider sm:tracking-widest text-brand-white hover:text-brand-yellow transition-colors whitespace-nowrap">Rate Card</a>
            {[['Calculator', 'roi-calculator', 'md:inline-flex'], ['Tickets', 'tickets', 'lg:inline-flex'], ['The Room', 'audience', 'xl:inline-flex']].map(([t, id, show]) => (
              <a key={id} href={`#${id}`} onClick={(e) => onJump(e, id)}
                className={`hidden ${show} items-center h-10 text-sm font-bold uppercase tracking-widest text-brand-white hover:text-brand-yellow transition-colors whitespace-nowrap`}>{t}</a>
            ))}
            <button type="button" onClick={() => openDeck('')} aria-label="Present" title="Present the rate card full screen"
              className="inline-flex items-center justify-center gap-2 w-10 h-10 md:w-auto shrink-0 rounded-full md:rounded-none border border-brand-white/20 md:border-0 text-brand-white hover:text-brand-yellow hover:border-brand-yellow/60 transition-colors">
              <Presentation className="w-[18px] h-[18px] md:w-4 md:h-4" aria-hidden />
              <span className="hidden md:inline text-sm font-bold uppercase tracking-widest">Present</span>
            </button>
            <a href="mailto:sales@next.io?subject=I'm interested in NEXTPredict 2027 partnerships!" aria-label="Contact Sales"
              className="bg-brand-yellow text-brand-dark rounded-full font-bold text-xs lg:text-sm uppercase tracking-widest hover:bg-white transition-colors whitespace-nowrap inline-flex items-center justify-center w-10 h-10 shrink-0 min-[500px]:w-auto min-[500px]:px-5 lg:px-6">
              <Mail className="w-4 h-4 min-[500px]:hidden" aria-hidden />
              <span className="hidden min-[500px]:inline">Contact Sales</span>
            </a>
          </div>
        </div>
      </nav>

      <main>
        {/* ── HERO ──
            One idea (the through line): the market night (ticker, probability
            line, Lower Manhattan), the edition line, the wordmark, one date and
            venue line and two buttons. The proof follows it, in its own band. */}
        <section className="hero-shell relative overflow-hidden bg-brand-dark pt-32 sm:pt-36">
          <MarketTicker />
          <MarketBackdrop />
          <div className="relative z-10 text-center max-w-5xl mx-auto px-4 sm:px-8">
            <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-yellow/30 bg-brand-yellow/10 text-brand-yellow text-[10px] min-[360px]:text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] sm:tracking-[0.2em] whitespace-nowrap">
              <TrendingUp className="w-3.5 h-3.5 shrink-0" aria-hidden /> The Prediction Markets Summit<span className="hidden sm:inline"> · 2027 edition</span>
            </p>
            <h1 className="hero-title mt-6 text-[clamp(2.75rem,14vw,8rem)] font-black tracking-tighter text-brand-white leading-none">
              NEXT<span className="text-brand-yellow">Predict</span>
            </h1>
            <p className="hero-line mt-5 sm:mt-6 text-[15px] sm:text-xl font-semibold text-brand-white/90 text-balance">
              <CalendarDays className="inline-block w-5 h-5 -mt-1 mr-2 text-brand-yellow align-middle" aria-hidden />{VENUE_LINE}
            </p>
            <div className="hero-ctas mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href="#start" onClick={(e) => onJump(e, 'start')}
                className="inline-flex items-center gap-2 min-h-12 px-7 rounded-full bg-brand-yellow text-brand-dark font-black text-sm uppercase tracking-widest hover:brightness-110 shadow-[0_0_30px_rgba(255,207,51,0.25)] transition">
                See the rate card <ArrowDown className="w-4 h-4" aria-hidden />
              </a>
              <button type="button" onClick={() => openDeck('')} title="Present the rate card full screen"
                className="inline-flex items-center gap-2 min-h-12 px-6 rounded-full border border-brand-white/25 bg-brand-dark/40 text-brand-white font-bold text-sm uppercase tracking-widest hover:border-brand-yellow hover:text-brand-yellow transition-colors">
                <Presentation className="w-4 h-4" aria-hidden /> Present
              </button>
            </div>
          </div>
          <FidiBand />
        </section>

        {/* ── PROOF BAND ── */}
        <ProofBand />

        {/* ── WHERE DO I START + PRODUCT MENU ── */}
        <WaysIn lens={lens} setLens={setLens} onJump={onJump} />
        <ProductMenu onJump={onJump} onPresent={openDeck} lens={lens} setLens={setLens} />

        {/* ── PRICING / RATE CARD ── */}
        <section id="pricing" className="jump-section relative bg-brand-dark pt-16 md:pt-20 border-t border-brand-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <SectionHead title="Partnership" accent="Rate Card"
              lede="Published prices in EUR, excluding VAT, all-in where stated. Where the same space is offered two ways, both routes sit on one card and you book one or the other.">
              {leadDataRule() && (
                <p className="mt-4 mx-auto max-w-3xl text-sm leading-relaxed text-brand-white/85">
                  <ScanLine className="mr-1.5 -mt-0.5 inline h-4 w-4 text-brand-yellow" aria-hidden />{leadDataRule()}
                </p>
              )}
              <button type="button" onClick={downloadRateCardPDF}
                className="mt-6 inline-flex items-center gap-2 min-h-11 px-6 rounded-full border border-brand-yellow/50 text-brand-yellow font-bold text-xs sm:text-sm uppercase tracking-widest hover:bg-brand-yellow/10 transition-colors">
                <Download className="w-4 h-4" aria-hidden /> Download Full Rate Card
              </button>
            </SectionHead>

            {/* Filters */}
            <div className="mb-10 space-y-2.5">
              <FilterRow label="Objective" options={impacts} active={activeImpact} setActive={setActiveImpact} />
              <FilterRow label="Format" options={types} active={activeType} setActive={setActiveType} />
              {filtering && (
                <p className="text-center text-xs text-brand-gray pt-1" aria-live="polite">
                  Showing {shownCount} of {CARD_COUNT} products ·{' '}
                  <button type="button" onClick={() => { setActiveImpact(null); setActiveType(null) }} className="min-h-10 font-bold text-brand-yellow underline underline-offset-2">Clear filters</button>
                </p>
              )}
            </div>
          </div>

          <FamilyBar groups={visibleGroups} active={activeCat} onJump={onJump} barRef={barRef} />

          <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-10 md:pt-12 pb-8">
            {visibleGroups.map(({ cat, cards }) => {
              const spans = familySpans(cards)
              const brief = FAMILY_BRIEFS[cat]
              return (
                <div key={cat} id={catId(cat)} data-cat={cat} className="jump-target mb-16 md:mb-20 last:mb-12">
                  <FamilyHeading cat={cat} count={cards.length} />
                  {brief && (
                    <p className="-mt-2 sm:-mt-4 mb-6 sm:mb-8 max-w-3xl text-[14.5px] sm:text-base leading-relaxed text-brand-white/75">
                      {brief.text}
                      {brief.room && <> <a href="#audience" onClick={(e) => onJump(e, 'audience')} className="inline-flex items-center gap-1 font-bold text-brand-yellow underline decoration-brand-yellow/40 underline-offset-4 hover:decoration-brand-yellow">See who&rsquo;s in the room <ArrowRight className="w-3.5 h-3.5" aria-hidden /></a></>}
                    </p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-5 sm:gap-6">
                    {cards.map((card, i) => (
                      <ProductCard key={card.key} card={card} span={spans[i]} rebooking={rebooking}
                        cartCounts={cartCounts} conflictedIds={conflictedIds} onAdd={addToCart} onPresent={openDeck} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── WHO'S IN THE ROOM (and why partner, #about) ── */}
        <RoomSection />

        {/* ── TICKETS ── */}
        <TicketsSection />

        {/* ── RECOGNITION LEVELS ── */}
        <section id="recognition" className="jump-section py-20 md:py-24 bg-brand-white/[0.03] relative border-y border-brand-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <SectionHead title="Partner" accent="Recognition" lede={RECOGNITION_LEDE} />
            <div data-anim style={anim}>
              <RecognitionLevels />
            </div>
            <p className="text-center text-brand-gray text-xs mt-8 opacity-70" data-anim style={anim}>{RECOGNITION_NOTE}</p>
          </div>
        </section>

        {/* ── ROI CALCULATOR ── nothing important sits below it: a short close */}
        <RoiCalculator cart={cart} onRemove={removeFromCart} rebooking={rebooking} />

        {/* ── CLOSE: REBOOKING AND CONTACT ── */}
        <section className="py-16 md:py-20 bg-brand-dark relative">
          <div className="max-w-5xl mx-auto px-4 sm:px-8 text-center" data-anim style={anim}>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-yellow/10 border border-brand-yellow/20 rounded-full text-brand-yellow text-xs font-bold tracking-widest uppercase mb-6">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden /><span>2026 Partners</span>
            </div>
            <h2 className="text-[2rem] leading-[1.05] sm:text-4xl md:text-5xl font-black text-brand-white uppercase tracking-tight mb-5">Rebook Early. <span className="text-brand-yellow">Keep 15%.</span></h2>
            <p className="text-base md:text-lg text-brand-gray max-w-3xl mx-auto mb-8 leading-relaxed">
              {REBOOKING_COPY} Toggle it in the calculator to see your pricing.
            </p>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              <a href="mailto:sales@next.io?subject=NEXTPredict 2027 rebooking"
                className="bg-brand-yellow text-brand-dark px-7 sm:px-8 py-4 rounded-full font-black text-sm uppercase tracking-widest hover:bg-white transition-colors inline-flex items-center gap-2">
                <Mail className="w-4 h-4" aria-hidden /> Talk To Partnerships
              </a>
              <button type="button" onClick={downloadRateCardPDF}
                className="border border-brand-white/20 text-brand-white px-7 sm:px-8 py-4 rounded-full font-black text-sm uppercase tracking-widest hover:border-brand-yellow hover:text-brand-yellow transition-colors inline-flex items-center gap-2">
                <Download className="w-4 h-4" aria-hidden /> Full Rate Card PDF
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-brand-white/10 py-14 bg-brand-white/[0.03]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col md:flex-row justify-between gap-8">
          <div>
            <p className="font-black text-2xl tracking-tight mb-2">NEXT<span className="text-brand-yellow">Predict</span> 2027</p>
            <p className="text-brand-gray text-sm">The Prediction Markets Summit · October 2027 · New York City</p>
            <p className="text-brand-gray/60 text-xs mt-1">Exact dates and venue to be announced.</p>
          </div>
          <div className="text-sm text-brand-gray space-y-1 md:text-right">
            <p><a href="mailto:sales@next.io" className="inline-flex items-center min-h-10 hover:text-brand-yellow transition-colors font-semibold">sales@next.io</a></p>
            <p><a href="https://next.io" target="_blank" rel="noreferrer" className="inline-flex items-center min-h-10 hover:text-brand-yellow transition-colors">next.io</a></p>
            <p className="text-xs text-brand-gray/60 max-w-md md:ml-auto">
              All prices exclude VAT. Availability subject to change without notice. Exclusive and shared routes
              over the same inventory are alternatives, never sold together. Ticket prices in USD; partnership
              prices in EUR.
            </p>
          </div>
        </div>
      </footer>

      <CalculatorPanel cart={cart} onRemove={removeFromCart} rebooking={rebooking} setRebooking={setRebooking} open={calcOpen} setOpen={setCalcOpen} onJump={onJump} />

      {start && (
        <PresentMode key={deckKey} slides={slides} startId={start.id} onClose={closeDeck}
          title={deckLens ? `2027 · ${lensLabel(deckLens)}` : '2027 · Partnership Rate Card'}
          label={`NEXTPredict 2027 ${deckLens ? `${lensLabel(deckLens)} products` : 'partnership rate card'}`}
          logo={<img alt="NEXTPredict" src={`${base}logos/nextpredict-logo.png`} className="h-5 sm:h-6 w-auto shrink-0" />}
          renderSlide={(s, ctx) => renderDeckSlide(s, deck, ctx)} />
      )}
    </div>
  )
}
