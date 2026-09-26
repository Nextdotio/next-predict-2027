import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react'
import {
  Mail, Calculator, Download, X, TrendingUp, CalendarDays, MapPin,
  CircleCheck, ChevronDown, ShieldCheck, Ticket, Layers, Users,
  LineChart, Landmark, Scale, Cpu, Newspaper, Banknote, Trophy, Sparkles,
  Info, ArrowRight, ArrowUp, Crown, Martini, Mic, Presentation, MonitorPlay,
  Handshake, Store, DoorClosed, Coffee, Video, Flag, Projector, ChevronRight,
  Award, ListChecks
} from 'lucide-react'
import { PresentMode, usePresent, CopyLinkButton } from './PresentMode.jsx'

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
    .terms svg{flex:none;margin-top:3px}`
function printDeliverables(bullets) {
  const { items, terms } = splitBullets(bullets)
  const lis = items.map((l) => `<li>${escHtml(l)}</li>`).join('')
  const tls = terms.map((t) => `<li>${t.kind === 'avail' ? ICON_CAL : ICON_INFO}<span>${escHtml(t.text)}</span></li>`).join('')
  return `${lis ? `<ul class="incl">${lis}</ul>` : ''}${tls ? `<div class="terms"><p class="tlabel">Availability &amp; terms</p><ul>${tls}</ul></div>` : ''}`
}
const openPrintWindow = (html) => {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 120000)
}

// ─── PDF proposal generator ─────────────────────────────────────────────────
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
    .footer strong{color:#1a1a1a}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}tr{page-break-inside:avoid}}
  </style></head><body>
  <div class="header">
    <div class="logo">NEXT<span>Predict</span> 2027</div>
    <div class="sub">Partnership Proposal &nbsp;&middot;&nbsp; Generated ${date}</div>
  </div>
  <div class="body">
    ${rebooking ? '<div class="discount">&#10003; 15% rebooking rate applied to all packages below (2026 partners only).</div>' : ''}
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
        ${printDeliverables(p.bullets)}
      </div>`
      }
      // as on the page: a tile names its route and price, plus its count or status
      const tileSub = (p) => (isOut(p) ? avail(p) : !p.exclusive && p.avail ? avail(p) : '')
      const tiles = card.options.map((p) => `<div class="tile"><span class="tl">${escHtml(routeLabel(card, p))}</span><span class="tp">${price(p)}</span>${tileSub(p) ? `<span class="ta">${tileSub(p)}</span>` : ''}</div>`).join('')
      const routes = card.options.map((p) => `<div class="route">
          <div class="rhead"><h4>${escHtml(routeLabel(card, p))}</h4><span class="rprice">${price(p)}</span></div>
          ${lede(p)}
          ${printDeliverables(p.bullets)}
        </div>`).join('')
      return `<div class="product multi">
        <div class="phead"><div><h3>${escHtml(card.title)}</h3></div></div>
        <div class="tiles">${tiles}</div>
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
    .foot{padding:24px 48px 40px;border-top:3px solid #ffcf33;margin-top:24px;color:#666;font-size:11px;line-height:1.7}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body>
  <div class="cover">
    <h1>NEXT<span>Predict</span> 2027</h1>
    <p>Full Partnership Rate Card &nbsp;&middot;&nbsp; October 2027 &nbsp;&middot;&nbsp; New York City &nbsp;&middot;&nbsp; Exact dates and venue to be announced &nbsp;&middot;&nbsp; Generated ${date}</p>
  </div>
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

// ─── Pricing data ───────────────────────────────────────────────────────────
// 2027 rate card. Prices in EUR, exclude VAT. Exclusive/shared versions of the
// same physical inventory are either/or routes and conflict in the calculator.
const pricing = [

  // Category Ownership
  { id: 1, cat: 'Category Ownership', title: 'Headline Partner', price: 300000, exclusive: true, avail: null, featured: true,
    quote: '"One brand over the entire event. Headline Partnership is category ownership of the prediction markets summit: your name in the event lock-up, first position everywhere the event appears."',
    bullets: 'Headline Partner status - the highest position in the partner hierarchy\n"Brought to you by [your brand]" event lock-up across venue and digital touchpoints\nPress release announcing your Headline Partnership\nPre-event executive interview, produced and distributed by NEXT.io media\nMost prominent venue branding across the event, plus top billing on website and digital channels\n30-second advertisement video played in conference breaks\nVisibility across event emails, social promotion, official photography and the aftermovie\n1x speaking opportunity confirmed with the conference production team\n10 Full Event passes + 2 VIP passes + 1 Speaker pass\n⚠️ One available - category ownership is sold once.',
    impact: ['Category Leadership', 'Brand Awareness', 'Thought Leadership'], type: ['Branding & Visibility', 'Speaking & Content'] },

  // NEXTworking Evening Events
  { id: 2, cat: 'NEXTworking Evening Events', title: 'Day 1 NEXTworking, Exclusive Partner', price: 150000, exclusive: true, avail: null, featured: true,
    quote: '"Own the biggest networking night of the event. The Day 1 NEXTworking evening is where the whole market - platforms, exchanges, operators and market makers - is in one room, under your brand alone."',
    bullets: 'Exclusive partner branding across the Day 1 NEXTworking evening event\nEvent video branding and brand-watermarked official photography\nBranded merchandise moment at the event\nSummit-wide general branding plus promotion and email visibility\nCredited in the official aftermovie\n4 Full Event passes\n⚠️ Either/or route: if the exclusive partnership sells, the shared Day 1 route is withdrawn.',
    impact: ['Brand Awareness', 'Deal Flow'], type: ['Networking & Hospitality'] },
  { id: 3, cat: 'NEXTworking Evening Events', title: 'Day 2 NEXTworking, Exclusive Partner', price: 125000, exclusive: true, avail: null,
    quote: '"Close the event with your name on the night. Exclusive ownership of the Day 2 NEXTworking evening - the wrap-party conversations where the follow-ups get agreed."',
    bullets: 'Exclusive partner branding across the Day 2 NEXTworking evening event\nEvent video branding and brand-watermarked official photography\nBranded merchandise moment at the event\nSummit-wide general branding plus promotion and email visibility\nCredited in the official aftermovie\n4 Full Event passes\n⚠️ Either/or route: if the exclusive partnership sells, the shared Day 2 route is withdrawn.',
    impact: ['Brand Awareness', 'Deal Flow'], type: ['Networking & Hospitality'] },
  { id: 4, cat: 'NEXTworking Evening Events', title: 'Pre-Registration Event, Exclusive Partner', price: 125000, exclusive: true, avail: null,
    quote: '"Meet the market before the doors open. The pre-registration evening is the first-mover networking moment of event week, and one brand owns it."',
    bullets: 'Exclusive partner branding across the pre-registration evening event\nEvent video branding and brand-watermarked official photography\nBranded merchandise moment at the event\nGeneral summit branding across the event\nCredited in the official aftermovie\n4 Full Event passes\n⚠️ Either/or route: if the exclusive partnership sells, the shared pre-registration route is withdrawn.',
    impact: ['Brand Awareness', 'Deal Flow'], type: ['Networking & Hospitality'] },
  { id: 5, cat: 'NEXTworking Evening Events', title: 'Day 1 NEXTworking, Non-Exclusive Partner', price: 38000, exclusive: false, avail: 5,
    quote: '"A shared route into the Day 1 evening: co-branding across the biggest networking night without the exclusive commitment."',
    bullets: 'Shared partner branding at the Day 1 NEXTworking evening event\nEvent video branding and brand-watermarked official photography\nBranded merchandise moment at the event\nGeneral summit branding\n2 Full Event passes\n⚠️ Shared route - released only while the Day 1 exclusive partnership remains unsold.',
    impact: ['Brand Awareness'], type: ['Networking & Hospitality'] },
  { id: 6, cat: 'NEXTworking Evening Events', title: 'Day 2 NEXTworking, Non-Exclusive Partner', price: 30000, exclusive: false, avail: 5,
    quote: '"Co-branding across the Day 2 closing evening - a shared presence at the night the market says its goodbyes and books its follow-ups."',
    bullets: 'Shared partner branding at the Day 2 NEXTworking evening event\nEvent video branding and brand-watermarked official photography\nBranded merchandise moment at the event\nGeneral summit branding\n2 Full Event passes\n⚠️ Shared route - released only while the Day 2 exclusive partnership remains unsold.',
    impact: ['Brand Awareness'], type: ['Networking & Hospitality'] },
  { id: 7, cat: 'NEXTworking Evening Events', title: 'Pre-Registration Event, Non-Exclusive Partner', price: 34000, exclusive: false, avail: 5,
    quote: '"A shared presence at the first networking moment of event week, as delegates collect badges and the market warms up."',
    bullets: 'Shared partner branding at the pre-registration evening event\nEvent video branding and brand-watermarked official photography\nBranded merchandise moment at the event\nGeneral summit branding\n2 Full Event passes\n⚠️ Shared route - released only while the pre-registration exclusive partnership remains unsold.',
    impact: ['Brand Awareness'], type: ['Networking & Hospitality'] },
  { id: 8, cat: 'NEXTworking Evening Events', title: 'C-Level Event (Bespoke)', price: 0, poa: true, exclusive: true, avail: null,
    quote: '"An invitation-only senior gathering, built around your target list. Format, guest profile and brand integration are scoped together - and priced to the brief."',
    bullets: 'Bespoke invitation-only senior executive gathering\nCurated decision-maker access built around an agreed guest profile\nFormat, hosting and brand integration scoped with our team\n2 VIP passes\n📅 Priced on application once scope and format are agreed.',
    impact: ['Deal Flow', 'Category Leadership'], type: ['Networking & Hospitality'] },

  // Leadership Stage
  { id: 10, cat: 'Leadership Stage', title: 'Leadership Stage Partner', price: 125000, exclusive: true, avail: null, featured: true,
    quote: '"Put your brand on the main stage of the prediction markets calendar. The Leadership Stage carries the headline content both days - and it sold out in 2026."',
    bullets: 'Leadership Stage area branding across both event days\nStage artwork and branded holding slide\nSummit-wide general branding\nWebsite, social and aftermovie visibility\n4 Full Event passes\n📅 Sold out in 2026 - one partner only.\n⚠️ The Leadership Stage Presenter slot is sold separately.',
    impact: ['Category Leadership', 'Brand Awareness', 'Thought Leadership'], type: ['Speaking & Content', 'Branding & Visibility'] },
  { id: 11, cat: 'Leadership Stage', title: 'Leadership Stage Presenter', price: 95000, exclusive: true, avail: null,
    quote: '"The single biggest speaking slot of the event: one exclusive C-level presentation on the Leadership Stage, Day 2. One slot. One brand."',
    bullets: '20-minute C-level presentation, interview or featured session on the Leadership Stage\nFull AV and production support\n"Presented by" session title on agenda, website and screens\n3 Full Event passes + 1 Speaker pass\n📅 Exclusive - one slot, Day 2 only.',
    impact: ['Thought Leadership', 'Category Leadership'], type: ['Speaking & Content'] },
  { id: 13, cat: 'Leadership Stage', title: 'Leadership Stage Custom Session', price: 60000, exclusive: false, avail: 2,
    quote: '"Your C-level executive alongside a guest C-level of your choosing - a moderated fireside on the main stage, presented by your brand."',
    bullets: 'Sponsor C-level plus guest C-level participant\n25-30 minute moderated discussion or fireside format\n"Presented by" session title on agenda, website and screens\n1 Full Event pass + 2 Speaker passes\n📅 One slot per day, subject to content approval.',
    impact: ['Thought Leadership'], type: ['Speaking & Content'] },
  { id: 14, cat: 'Leadership Stage', title: 'Leadership Stage Chair Partner', price: 45000, exclusive: true, avail: null,
    quote: '"Every seat in the main conference room, both days. Chair branding puts your logo in every audience shot of the headline programme."',
    bullets: 'Branding on all seats in the main conference hall on both event days\nSummit-wide general branding\nWebsite, social and aftermovie visibility\n2 Full Event passes',
    impact: ['Brand Awareness'], type: ['Branding & Visibility'] },
  { id: 15, cat: 'Leadership Stage', title: 'Leadership Stage Branded Session', price: 30000, exclusive: false, avail: 6,
    quote: '"A \'Powered by\' session on the main stage: 25-30 minutes of your expertise, with your C-level speaker, in front of the whole event."',
    bullets: '"Powered by" session, 25-30 minutes\n1 C-level sponsor speaker\nSession branding on agenda, website and screens\n1 Full Event pass + 1 Speaker pass\n📅 Two slots on Day 1 and two on Day 2, subject to programme.',
    impact: ['Thought Leadership'], type: ['Speaking & Content'] },
  { id: 16, cat: 'Leadership Stage', title: 'Leadership Stage Non-Branded Panel', price: 19000, exclusive: false, avail: 4,
    quote: '"A seat on a curated main-stage panel aligned to your expertise - editorial participation with your leadership in the conversation."',
    bullets: 'Curated panel participation aligned to your expertise\n25-30 minute session with C-level participation\nNo brand attribution on the session - editorial format\nPartner logo on the website\n1 Speaker pass\n📅 Programme-controlled inventory.',
    impact: ['Thought Leadership'], type: ['Speaking & Content'] },

  // Stage 2 Hub
  { id: 17, cat: 'Stage 2 Hub', title: 'Stage 2 Partner (Both-Days Exclusive)', price: 115000, exclusive: true, avail: null,
    quote: '"The second stage as your event-long hub: backdrop, chairs, a custom panel and a two-day branded presence the market walks through all event."',
    bullets: 'Event-long exclusive Stage 2 hub across both days\nBackdrop branding around the two stage screens\nDelegate-chair branding\n1 Custom Panel session included\nFull two-day hub presence\nWebsite, social and aftermovie visibility\n3 Full Event passes + 1 Speaker pass\n⚠️ Either/or route with the two per-day Stage 2 partnerships - never sold together.',
    impact: ['Brand Awareness', 'Thought Leadership'], type: ['Speaking & Content', 'Branding & Visibility'] },
  { id: 18, cat: 'Stage 2 Hub', title: 'Stage 2 Partner (Per Day)', price: 65000, exclusive: false, avail: 2,
    quote: '"Own the second stage for a full day: backdrop, chair branding, a custom panel and a one-day hub presence built around your brand."',
    bullets: 'Stage 2 backdrop branding around the two stage screens\nDelegate-chair branding\n1 Custom Panel session included\nFull one-day hub presence\nWebsite, social and aftermovie visibility\n3 Full Event passes + 1 Speaker pass\n📅 One partnership available. Stage 3 runs its panel programme on Day 1; Day 2 is the workshop track.',
    impact: ['Brand Awareness', 'Thought Leadership'], type: ['Speaking & Content', 'Branding & Visibility'] },
  { id: 19, cat: 'Stage 2 Hub', title: 'Stage 2 Presenter', price: 55000, exclusive: false, avail: 2,
    quote: '"A 20-minute C-level keynote on Stage 2, presented by your brand, with full production support."',
    bullets: '20-minute C-level keynote\nFull AV and production support\n"Presented by" session title on agenda and website\n2 Full Event passes + 1 Speaker pass\n📅 One slot per day, subject to programme.',
    impact: ['Thought Leadership'], type: ['Speaking & Content'] },
  { id: 20, cat: 'Stage 2 Hub', title: 'Stage 2 Custom Session', price: 40000, exclusive: false, avail: 2,
    quote: '"Your C-level and a guest C-level in a moderated Stage 2 fireside, presented by your brand."',
    bullets: 'Sponsor C-level plus guest C-level participant\n25-30 minute moderated discussion or fireside format\n"Presented by" session title on agenda, website and screens\n1 Full Event pass + 2 Speaker passes\n📅 One slot per day, subject to content approval.',
    impact: ['Thought Leadership'], type: ['Speaking & Content'] },
  { id: 21, cat: 'Stage 2 Hub', title: 'Stage 2 Branded Session', price: 25000, exclusive: false, avail: 4,
    quote: '"A \'Powered by\' Stage 2 session: 25-30 minutes with your C-level speaker and your brand on the room."',
    bullets: '"Powered by" session, 25-30 minutes\n1 C-level sponsor speaker\nSession branding on agenda, website and screens\n1 Full Event pass + 1 Speaker pass\n📅 One slot per day, subject to programme.',
    impact: ['Thought Leadership'], type: ['Speaking & Content'] },
  { id: 22, cat: 'Stage 2 Hub', title: 'Stage 2 Non-Branded Panel', price: 16000, exclusive: false, avail: 4,
    quote: '"Curated Stage 2 panel participation - editorial format, C-level conversation, your leadership in the room."',
    bullets: 'Curated panel participation, 25-30 minutes\nC-level participation, no brand attribution\nPartner logo on the website\n1 Speaker pass\n📅 Programme-controlled inventory.',
    impact: ['Thought Leadership'], type: ['Speaking & Content'] },

  // Stage 3 Hub
  { id: 24, cat: 'Stage 3 Hub', title: 'Stage 3 Partner (Day 1)', price: 33000, exclusive: true, avail: null,
    quote: '"A full day of Stage 3 ownership: stage branding, chair branding, a holding slide, a custom panel and a one-day hub presence."',
    bullets: 'Branding on stage returns and content-screen surrounds\nChair branding and branded holding slide\n1 Custom Panel session included\nFull one-day hub presence\nWebsite, social and aftermovie visibility\n2 Full Event passes + 1 Speaker pass\n📅 One partnership available. Stage 3 runs its panel programme on Day 1; Day 2 is the workshop track.',
    impact: ['Brand Awareness', 'Thought Leadership'], type: ['Speaking & Content', 'Branding & Visibility'] },
  { id: 25, cat: 'Stage 3 Hub', title: 'Stage 3 Presenter', price: 30000, exclusive: true, avail: null,
    quote: '"A 20-minute C-level keynote on Stage 3, presented by your brand."',
    bullets: '20-minute C-level keynote\nFull AV and production support\n"Presented by" session title on agenda and website\n1 Full Event pass + 1 Speaker pass\n📅 One slot per day.',
    impact: ['Thought Leadership'], type: ['Speaking & Content'] },
  { id: 26, cat: 'Stage 3 Hub', title: 'Stage 3 Custom Session', price: 21500, exclusive: false, avail: 1,
    quote: '"Your C-level and a guest C-level in a moderated Stage 3 conversation, presented by your brand."',
    bullets: 'Sponsor C-level plus guest C-level participant\n25-30 minute moderated discussion or fireside format\n"Presented by" session title on agenda, website and screens\n2 Speaker passes\n📅 Current availability is exclusive to Day 1.',
    impact: ['Thought Leadership'], type: ['Speaking & Content'] },
  { id: 27, cat: 'Stage 3 Hub', title: 'Stage 3 Branded Session', price: 13500, exclusive: false, avail: 2,
    quote: '"The entry point to branded stage time: a \'Powered by\' Stage 3 session with your C-level speaker."',
    bullets: '"Powered by" session, 25-30 minutes\n1 C-level sponsor speaker\nSession branding on agenda, website and screens\n1 Speaker pass\n📅 Current availability is exclusive to Day 1.',
    impact: ['Thought Leadership'], type: ['Speaking & Content'] },
  { id: 28, cat: 'Stage 3 Hub', title: 'Stage 3 Non-Branded Panel', price: 10000, exclusive: false, avail: 2,
    quote: '"Curated Stage 3 panel participation - the most accessible route to a speaking position at the event."',
    bullets: 'Curated panel participation, 25-30 minutes\nC-level participation, no brand attribution\nPartner logo on the website\n1 Speaker pass\n📅 Two slots on Day 1.',
    impact: ['Thought Leadership'], type: ['Speaking & Content'] },

  // Workshops & Curated Networking
  { id: 29, cat: 'Workshops & Curated Networking', title: 'Curated Workshop + 5 Curated Opt-In Invites', price: 85000, exclusive: false, avail: 3,
    quote: '"Run the room you actually want to be in. A targeted workshop for your team plus five curated opt-in invitations to the accounts you name."',
    bullets: 'Host a targeted workshop session\n5 curated opt-in invite targets with facilitated invitations\nWebsite, social and aftermovie visibility\n3 Full Event passes + 1 Speaker pass\n⚠️ Invitations are facilitated on an opt-in basis - attendance is not guaranteed.',
    impact: ['Deal Flow', 'Lead Generation', 'Thought Leadership'], type: ['Speaking & Content', 'Networking & Hospitality'] },
  { id: 30, cat: 'Workshops & Curated Networking', title: 'Curated Introduction Package', price: 15000, exclusive: false, avail: 3,
    quote: '"Six introductions that matter more than sixty scans. We brief on your targets, match against the room and facilitate opt-in introductions with an outcome summary."',
    bullets: 'Partner brief and target-account matching\nSix facilitated opt-in introductions\nOutcome summary after the event\n⚠️ Introductions are opt-in and subject to mutual approval.',
    impact: ['Deal Flow', 'Lead Generation'], type: ['Networking & Hospitality'] },

  // Exhibition & Start-Up Zone
  { id: 31, cat: 'Exhibition', title: 'Exhibition Stand 6x8, Gallery Showcase, Turnkey', price: 135000, exclusive: true, avail: null,
    quote: '"The largest showcase position on the floor: a 6x8 gallery landmark for a brand that wants to anchor the exhibition."',
    bullets: 'Premium 6x8 landmark position in the gallery\nTurnkey route: NEXT.io designs, builds, breaks down and cleans the stand\nWebsite and floorplan listing\nSignage, furniture and power package included\nLead-capture eligibility, subject to registration and data setup\nIndividual pre-event welcome post on social media\nLogo on the partners section of the website\nLogo within the event guide\nMention in the post-event aftermovie\n4 Full Event passes\n📅 One position available.\n⚠️ Either/or route with the space-only option for the same booth - never sold together.',
    impact: ['Lead Generation', 'Brand Awareness'], type: ['Exhibition'] },
  { id: 32, cat: 'Exhibition', title: 'Exhibition Stand 8x4, Planner Area Showcase, Turnkey', price: 110000, exclusive: true, avail: null,
    quote: '"An 8x4 showcase in the planner area - a landmark footprint where delegates plan their day and the traffic concentrates."',
    bullets: 'Premium 8x4 position in the delegate planning zone\n⚠️ Quantities and positions reflect the reference venue layout - final spec confirmed when the venue is announced\nTurnkey route: NEXT.io designs, builds, breaks down and cleans the stand\nWebsite and floorplan listing\nSignage, furniture and power package included\nLead-capture eligibility, subject to registration and data setup\nIndividual pre-event welcome post on social media\nLogo on the partners section of the website\nLogo within the event guide\nMention in the post-event aftermovie\n4 Full Event passes\n📅 One position available.\n⚠️ Either/or route with the space-only option for the same booth - never sold together.',
    impact: ['Lead Generation', 'Brand Awareness'], type: ['Exhibition'] },
  { id: 33, cat: 'Exhibition', title: 'Exhibition Stand 6x4, Premium Gallery Position, Turnkey', price: 75000, exclusive: true, avail: null,
    quote: '"A top-position 6x4 physical showcase with premium gallery visibility."',
    bullets: 'Premium 6x4 gallery position with top visibility\nTurnkey route: NEXT.io designs, builds, breaks down and cleans the stand, with furniture and power included\nWebsite and floorplan listing\nAgreed signage package\nLead-capture eligibility, subject to registration and data setup\nIndividual pre-event welcome post on social media\nLogo on the partners section of the website\nLogo within the event guide\nMention in the post-event aftermovie\n4 Full Event passes\n📅 One position available.\n⚠️ Either/or route with the space-only option for the same booth - never sold together.',
    impact: ['Lead Generation', 'Brand Awareness'], type: ['Exhibition'] },
  { id: 57, cat: 'Exhibition', title: 'Exhibition Stand 6x2, Turnkey', price: 60000, exclusive: false, avail: 6,
    quote: '"A double-width turnkey footprint on the cluster floor - room for a working team and a meeting corner without a landmark build."',
    bullets: 'Branded 6x2 physical footprint, formed from two adjacent 3x2 cluster positions - it is not separate stock\nTurnkey format: standard furniture and power package included\nAdditional meeting space and clearer floor presence than a single cluster unit\nWebsite and floorplan listing\nAgreed signage package\nLead-capture eligibility, subject to registration and data setup\nLogo on the partners section of the website\nLogo within the event guide\nMention in the post-event aftermovie\n3 Full Event passes\n📅 Limited: every 6x2 built removes two 3x2 positions from the twelve-position cluster pool, so a maximum of six can be built.',
    impact: ['Lead Generation', 'Brand Awareness'], type: ['Exhibition'] },
  { id: 34, cat: 'Exhibition', title: 'Exhibition Stand 3x2, Turnkey', price: 33000, exclusive: false, avail: 12,
    quote: '"The core exhibition product: a turnkey 3x2 branded footprint on the floor where the market does its walking."',
    bullets: 'Branded 3x2 physical footprint\nTurnkey format: standard furniture and power package included\nWebsite and floorplan listing\nAgreed signage package\nLead-capture eligibility, subject to registration and data setup\nLogo on the partners section of the website\nLogo within the event guide\nMention in the post-event aftermovie\n2 Full Event passes\n📅 Twelve positions available. For a double-width footprint, see the 6x2 Turnkey stand.',
    impact: ['Lead Generation', 'Brand Awareness'], type: ['Exhibition'] },

  // Private Meeting Rooms
  { id: 37, cat: 'Private Meeting Rooms', title: 'Private Meeting Room, 12 Person', price: 62000, exclusive: true, avail: null,
    quote: '"Your own boardroom inside the event: a private branded 12-person room for the meetings that need a door."',
    bullets: 'Private branded meeting room for both event days\n2 freestanding banners, table and 12 chairs\nTV screen and directional signage\nBranded merchandise option\nSummit-wide general branding\n3 Full Event passes',
    impact: ['Deal Flow'], type: ['Networking & Hospitality'] },
  { id: 38, cat: 'Private Meeting Rooms', title: 'Private Meeting Room, 8 Person', price: 38500, exclusive: true, avail: null,
    quote: '"A private branded 8-person room - deal space for a team that runs a full meeting diary."',
    bullets: 'Private branded meeting room for both event days\n2 freestanding banners, table and 8 chairs\nTV screen and directional signage\nBranded merchandise option\nSummit-wide general branding\n2 Full Event passes',
    impact: ['Deal Flow'], type: ['Networking & Hospitality'] },
  { id: 39, cat: 'Private Meeting Rooms', title: 'Private Meeting Room, 6 Person', price: 31000, exclusive: true, avail: null,
    quote: '"A private branded 6-person room for focused meetings away from the floor."',
    bullets: 'Private branded meeting room for both event days\nFreestanding banner, table and 6 chairs\nTV screen and directional signage\nBranded merchandise option\nSummit-wide general branding\n2 Full Event passes',
    impact: ['Deal Flow'], type: ['Networking & Hospitality'] },
  { id: 40, cat: 'Private Meeting Rooms', title: 'Private Meeting Room, 4 Person', price: 25000, exclusive: true, avail: null,
    quote: '"A private branded 4-person room: the most efficient deal-space on the card."',
    bullets: 'Private branded meeting room for both event days\nFreestanding banner, table and 4 chairs\nTV screen and directional signage\nBranded merchandise option\nSummit-wide general branding\n2 Full Event passes\n📅 One room available.',
    impact: ['Deal Flow'], type: ['Networking & Hospitality'] },

  // Hospitality & Lounges
  { id: 41, cat: 'Hospitality & Lounges', title: 'Meeting Area Sponsor', price: 77000, exclusive: true, avail: null,
    quote: '"Own the room where the meetings happen: the meeting and dining area, branded end to end for both days."',
    bullets: 'Meeting and dining area branding across both event days\nRefreshment bar backdrop branding\nCredenza branding and freestanding banner\nDigital display and projector visibility\nSummit-wide general branding\n4 Full Event passes',
    impact: ['Brand Awareness', 'Deal Flow'], type: ['Networking & Hospitality', 'Branding & Visibility'] },
  { id: 42, cat: 'Hospitality & Lounges', title: 'Gallery Nourish Bars, Exclusive (All Three)', price: 75000, exclusive: true, avail: null,
    quote: '"Every coffee, every refuel, your brand: exclusive ownership of all three Nourish Bars, with branded cups and the projector wall."',
    bullets: 'Exclusive branding across all three Nourish Bars\n⚠️ Quantities and positions reflect the reference venue layout - final spec confirmed when the venue is announced\nBranded cups across the catering points\nProjector wall branding\nSummit-wide general branding\nWebsite, social and aftermovie visibility\n4 Full Event passes\n⚠️ Either/or route with the three individual Nourish Bar sponsorships - never sold together.',
    impact: ['Brand Awareness'], type: ['Networking & Hospitality', 'Branding & Visibility'] },
  { id: 43, cat: 'Hospitality & Lounges', title: 'Nourish Bar Sponsor', price: 28500, exclusive: false, avail: 3,
    quote: '"High-frequency hospitality branding: one of the three Nourish Bars, where every delegate returns several times a day."',
    bullets: 'Branding across one gallery Nourish Bar and its credenzas\nSummit-wide general branding\nWebsite, social and aftermovie visibility\n2 Full Event passes\n📅 Three bars available individually.\n⚠️ Either/or route with the all-three exclusive - never sold together.',
    impact: ['Brand Awareness'], type: ['Networking & Hospitality', 'Branding & Visibility'] },
  { id: 44, cat: 'Hospitality & Lounges', title: "Speakers' Lounge Sponsor", price: 54000, exclusive: true, avail: null,
    quote: '"Your brand around every speaker at the event: the VIP speakers lounge, hosted under your name for both days."',
    bullets: 'VIP speakers lounge branding across both event days\nVideo advertisement in the lounge\nFreestanding banner\nFood and drink station at breakfast and lunch on both days\nSummit-wide general branding\n3 Full Event passes',
    impact: ['Brand Awareness', 'Thought Leadership'], type: ['Networking & Hospitality', 'Branding & Visibility'] },

  // Media & Content
  { id: 45, cat: 'Media & Content', title: 'Livestream Sponsor', price: 92500, exclusive: true, avail: null,
    quote: '"Reach the market that could not fly in. The livestream carries the event beyond the room - with your brand on every frame."',
    bullets: 'Logo on the event livestream\nBranded video in stream breaks\nPre-event and daily social promotion\nEmail promotion before the stream goes live\nSponsor-use livestream link for your own channels\nSummit-wide general branding\n4 Full Event passes',
    impact: ['Brand Awareness', 'Thought Leadership'], type: ['Media'] },
  { id: 46, cat: 'Media & Content', title: 'Media Zone Sponsor', price: 65000, exclusive: true, avail: null,
    quote: '"The room where the interviews happen: media zone branding and a hosted content presence at the centre of event coverage."',
    bullets: 'Media zone branding across both event days\nWelcome-area and backdrop branding\nDedicated social promotion\nSummit-wide general branding\n3 Full Event passes\n⚠️ Interview formats and content slots are scoped with the NEXT.io media team at contract.',
    impact: ['Brand Awareness', 'Thought Leadership'], type: ['Media'] },
  { id: 47, cat: 'Media & Content', title: 'Press Lounge Sponsor', price: 22000, exclusive: true, avail: null,
    quote: '"Host the press. Exclusive branding of the press lounge puts your name in front of every journalist covering the event."',
    bullets: 'Exclusive press lounge branding across both event days\nHosted presence in front of attending media\nSummit-wide general branding\nWebsite, social and aftermovie visibility\n2 Full Event passes',
    impact: ['Brand Awareness'], type: ['Media'] },
  { id: 48, cat: 'Media & Content', title: 'Advertisement Video', price: 13500, exclusive: false, avail: 8,
    quote: '"Thirty seconds in front of the whole room: your video in conference breaks and on the gallery video wall."',
    bullets: '30-second video played during conference breaks\nPlacement on the gallery video wall\nSummit-wide general branding\nWebsite and shared social visibility\nCredited in the official aftermovie\n1 Full Event pass\n📅 Eight placements available.',
    impact: ['Brand Awareness'], type: ['Media', 'Branding & Visibility'] },

  // Venue Branding
  { id: 49, cat: 'Venue Branding', title: 'Online & Onsite Registration Sponsor', price: 110000, exclusive: true, avail: null,
    quote: '"Meet every delegate before the event starts. Registration wraps the whole journey in your brand - from the booking page to the arrival desk."',
    bullets: 'Branding on the registration page, confirmation emails and digital tickets\nOnsite registration area branding\n2 curved LED screens at registration\n⚠️ Quantities and positions reflect the reference venue layout - final spec confirmed when the venue is announced\nBranded registration desk\nSummit-wide general branding\n4 Full Event passes',
    impact: ['Brand Awareness', 'Lead Generation'], type: ['Branding & Visibility'] },
  { id: 50, cat: 'Venue Branding', title: 'Cloakroom Sponsor', price: 32000, exclusive: true, avail: null,
    quote: '"First in, last out: the cloakroom greets every coat, bag and delegate on the way in and the way home."',
    bullets: 'Cloakroom branding across both event days\n1 LCD screen in the cloakroom area\nCounter branding\nSummit-wide general branding\nWebsite, social and aftermovie visibility\n2 Full Event passes',
    impact: ['Brand Awareness'], type: ['Branding & Visibility'] },
  { id: 51, cat: 'Venue Branding', title: 'Stair Risers Sponsor', price: 31000, exclusive: true, avail: null,
    quote: '"Fifteen stair risers behind registration, plus an LCD video position - branding every delegate climbs past all day."',
    bullets: 'Branding across 15 stair risers behind registration\n⚠️ Quantities and positions reflect the reference venue layout - final spec confirmed when the venue is announced\nLCD video advertisement\nSummit-wide general branding\n2 Full Event passes',
    impact: ['Brand Awareness'], type: ['Branding & Visibility'] },
  { id: 52, cat: 'Venue Branding', title: 'Badge Sponsor', price: 32000, exclusive: true, avail: null,
    quote: '"On every delegate, in every conversation, in every photo: your logo on all event badges."',
    bullets: 'Logo on all delegate badges\nSummit-wide general branding\nWebsite and shared social visibility\nCredited in the official aftermovie\n2 Full Event passes',
    impact: ['Brand Awareness'], type: ['Branding & Visibility'] },
  { id: 53, cat: 'Venue Branding', title: 'Lanyard Sponsor', price: 45000, exclusive: false, avail: 2,
    quote: '"The highest-frequency wearable branding at the event: your logo around delegates\' necks both days."',
    bullets: 'Sold as two units - each unit brands one of the two lanyard designs, roughly half of all delegates\nSummit-wide general branding\nWebsite, social and aftermovie visibility\n2 Full Event passes\n📅 Two units available - take both for full lanyard coverage.',
    impact: ['Brand Awareness'], type: ['Branding & Visibility'] },
  { id: 54, cat: 'Venue Branding', title: 'Restroom Sponsorship', price: 28000, exclusive: true, avail: null,
    quote: '"Guaranteed reach, zero competition: exclusive branding across every restroom in the venue."',
    bullets: 'Branding across all venue restrooms\nMirror vinyls and clings\n⚠️ Quantities and positions reflect the reference venue layout - final spec confirmed when the venue is announced\n12 branded toiletry baskets\nBranded merchandise option\nExclusive category visibility\nWebsite, social and aftermovie visibility\n2 Full Event passes',
    impact: ['Brand Awareness'], type: ['Branding & Visibility'] },
  { id: 55, cat: 'Venue Branding', title: 'Digital Event Guide Sponsor', price: 35000, exclusive: true, avail: null,
    quote: '"Every time a delegate checks the agenda, they see you: the digital event guide, QR touchpoints and agenda branding."',
    bullets: 'Logo and QR code on the badge linking to the agenda\nLogo on the digital agenda\nBranded QR table tents across the venue\nSummit-wide general branding\nWebsite, social and aftermovie visibility\n2 Full Event passes',
    impact: ['Brand Awareness'], type: ['Branding & Visibility'] },
  { id: 56, cat: 'Venue Branding', title: 'Wi-Fi Sponsor', price: 28000, exclusive: true, avail: null,
    quote: '"Delegates type your brand to get online: custom network name and password, plus badge visibility."',
    bullets: 'Logo on delegate badges in the Wi-Fi section\nCustom network name and password\nSummit-wide general branding\nWebsite, social and aftermovie visibility\n2 Full Event passes',
    impact: ['Brand Awareness'], type: ['Branding & Visibility'] },
  { id: 58, cat: 'Exhibition', title: 'Exhibition Stand 6x8, Gallery Showcase, Space Only', price: 119000, exclusive: true, avail: null,
    quote: '"The largest showcase position on the floor, space only: a 6x8 gallery landmark for a brand that wants to anchor the exhibition."',
    bullets: 'Premium 6x8 landmark position in the gallery\nSpace-only route: the partner designs and builds the stand at their own cost\nWebsite and floorplan listing\nNEXT.io can introduce a stand-build supplier on request\nLead-capture eligibility, subject to registration and data setup\nIndividual pre-event welcome post on social media\nLogo on the partners section of the website\nLogo within the event guide\nMention in the post-event aftermovie\n4 Full Event passes\n📅 One position available.\n⚠️ Either/or route with the turnkey option for the same booth - never sold together.',
    impact: ['Lead Generation', 'Brand Awareness'], type: ['Exhibition'] },
  { id: 59, cat: 'Exhibition', title: 'Exhibition Stand 8x4, Planner Area Showcase, Space Only', price: 97000, exclusive: true, avail: null,
    quote: '"An 8x4 showcase in the planner area - a landmark footprint where delegates plan their day and the traffic concentrates."',
    bullets: 'Premium 8x4 position in the delegate planning zone\n⚠️ Quantities and positions reflect the reference venue layout - final spec confirmed when the venue is announced\nSpace-only route: the partner designs and builds the stand at their own cost\nWebsite and floorplan listing\nNEXT.io can introduce a stand-build supplier on request\nLead-capture eligibility, subject to registration and data setup\nIndividual pre-event welcome post on social media\nLogo on the partners section of the website\nLogo within the event guide\nMention in the post-event aftermovie\n4 Full Event passes\n📅 One position available.\n⚠️ Either/or route with the turnkey option for the same booth - never sold together.',
    impact: ['Lead Generation', 'Brand Awareness'], type: ['Exhibition'] },
  { id: 60, cat: 'Exhibition', title: 'Exhibition Stand 6x4, Premium Gallery Position, Space Only', price: 66000, exclusive: true, avail: null,
    quote: '"A top-position 6x4 physical showcase with premium gallery visibility."',
    bullets: 'Premium 6x4 gallery position with top visibility\nSpace-only route: the partner designs and builds the stand at their own cost\nWebsite and floorplan listing\nAgreed signage package\nLead-capture eligibility, subject to registration and data setup\nIndividual pre-event welcome post on social media\nLogo on the partners section of the website\nLogo within the event guide\nMention in the post-event aftermovie\n4 Full Event passes\n📅 One position available.\n⚠️ Either/or route with the turnkey option for the same booth - never sold together.',
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
  17: [18], 18: [17], // Stage 2: both-days exclusive vs per-day
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
    body: <>A gated flat rate for qualifying start-ups - application-based, capped for the event and limited to one per company. Apply via <a className="text-brand-yellow font-semibold" href="mailto:sales@next.io?subject=NEXTPredict 2027 Start-Up Pass">sales@next.io</a>.</> },
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
  ['+69', 'Partner NPS · Valletta 2026', true],
  ['+62', 'Partner NPS · New York 2026', true],
  ['+27', 'Industry Benchmark', false],
]
const NPS_SOURCE = 'Partner Net Promoter Scores from the NEXT Summit 2026 post-event surveys; industry benchmark as reported by the survey platform.'
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

function TermsList({ terms }) {
  if (!terms.length) return null
  return (
    <div className="mt-5 pt-4 border-t border-brand-white/10">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-gray mb-2.5">Availability &amp; terms</p>
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
    </div>
  )
}

// A card laid out wide (its container at @2xl) has the room, so it shows every
// line and drops the toggle; the collapse is for narrow cards only.
function DeliverablesList({ bullets, featured = false }) {
  const [expanded, setExpanded] = useState(false)
  const { items, terms } = splitBullets(bullets)
  // collapse only when it hides at least two lines - "Show 1 more" is a wasted tap
  const collapsedCount = items.length - (featured ? 10 : 4) >= 2 ? (featured ? 10 : 4) : items.length
  const hiddenCount = items.length - collapsedCount
  return (
    <>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-gray mb-3">What&rsquo;s included</p>
      <ul className={featured ? 'space-y-3' : 'space-y-2'}>
        {items.map((line, i) => (
          <li key={i} className={`items-start text-sm ${featured ? 'text-brand-white/90' : 'text-brand-white/80'} ${i < collapsedCount || expanded ? 'flex' : 'hidden @2xl:flex'}`}>
            <CircleCheck className="text-brand-yellow mr-3 shrink-0 mt-0.5 w-4 h-4" aria-hidden />
            <span className="leading-relaxed">{line}</span>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}
          className="@2xl:hidden mt-1.5 -ml-1 inline-flex items-center gap-1.5 min-h-10 px-1 text-xs font-bold uppercase tracking-wider text-brand-yellow hover:text-brand-yellow/80 transition-colors">
          {expanded ? 'Show less' : `Show ${hiddenCount} more`}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} aria-hidden />
        </button>
      )}
      <TermsList terms={terms} />
    </>
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
  const tone = item.status === 'sold' ? 'bg-brand-white/15 text-brand-white'
    : item.status === 'reserved' ? 'bg-brand-yellow/15 text-brand-yellow'
      : 'bg-brand-white/10 text-brand-gray'
  return <div className={`${pos} px-4 py-1.5 ${tone}`}>{label}</div>
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
// One component for every card. `featured` is the gold full-row treatment; a
// regular card that ends up alone on its row (see `spanClass`) keeps the regular
// look but, being wide, switches to the same two-column layout by container
// query (`@2xl`), so it never reads as a stretched narrow card.
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
  const shell = featured
    ? `col-span-full border-brand-yellow/40 bg-gradient-to-br from-brand-yellow/[0.16] via-brand-dark/95 to-brand-dark shadow-[0_0_60px_rgba(255,207,51,0.08)] hover:border-brand-yellow/70 hover:shadow-[0_0_80px_rgba(255,207,51,0.16)] ${allSold ? 'opacity-60' : ''}`
    : `${span} bg-brand-white/[0.04] ${allSold ? 'border-brand-white/5 opacity-60' : 'border-brand-white/10 hover:border-brand-yellow/40 hover:bg-brand-white/[0.07]'}`
  return (
    <article id={productId(card)} aria-labelledby={`${productId(card)}-title`}
      className={`jump-target clip-box @container relative flex flex-col rounded-2xl border transition-colors duration-300 ${shell}`}>
      {multi && card.options.map((o) => <span key={o.id} id={productId(o)} className="jump-target absolute top-0 left-0" aria-hidden="true" />)}
      {featured && <div className="absolute top-0 left-0 w-80 h-80 bg-brand-yellow/8 rounded-full blur-3xl pointer-events-none" />}
      <CornerBadge item={item} featured={featured} />
      {/* narrow: the title starts under the corner badge and runs full width; wide: side by side */}
      <div className={`relative z-10 flex-1 flex flex-col @2xl:flex-row @2xl:gap-12 ${featured
        ? 'px-6 sm:px-8 md:px-10 pt-12 pb-6 sm:pb-8 md:pb-10 @2xl:pt-10'
        : 'px-5 sm:px-7 pt-10 pb-5 sm:pb-7 @2xl:pt-7'}`}>
        <div className="@2xl:w-5/12 flex flex-col">
          <h4 id={`${productId(card)}-title`}
            className={`font-black text-brand-white leading-tight ${featured ? 'text-[1.75rem] sm:text-3xl md:text-4xl mb-5 @2xl:pr-4' : 'text-xl @2xl:text-2xl mb-3.5'}`}>
            {card.title}
          </h4>
          {multi && <OptionTiles card={card} sel={item.id} setSel={setSel} rebooking={rebooking} />}
          <PriceBlock item={item} rebooking={rebooking} featured={featured} />
          <Lede text={item.quote} featured={featured} />
          <TagRow item={item} featured={featured} className="hidden @2xl:flex" />
        </div>
        <div className="@2xl:w-7/12 flex-1 flex flex-col">
          <div className="flex-1">
            <DeliverablesList key={item.id} bullets={item.bullets} featured={featured} />
          </div>
          <TagRow item={item} featured={featured} className="@2xl:hidden mt-5" />
          <div className="mt-5 pt-5 border-t border-brand-white/10">
            <AddButton item={item} count={count} conflicted={conflicted} onAdd={onAdd} featured={featured} />
            {/* quiet, under the button: Present opens the deck on this product,
                Copy link copies this card's address (a route card: the route
                on screen, which reopens the card on it) */}
            <div className="mt-2 -mb-2 flex flex-wrap items-center justify-end gap-x-1">
              <button type="button" onClick={() => onPresent(productId(item))} title="Present this product full screen"
                className={`${CARD_QUIET} ${CARD_QUIET_TONE}`}>
                <Presentation className="w-3.5 h-3.5 shrink-0" aria-hidden /> Present
              </button>
              <CopyLinkButton id={productId(item)} look={CARD_QUIET} className={CARD_QUIET_TONE} />
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
const CARD_QUIET = 'inline-flex items-center gap-1.5 min-h-10 sm:min-h-9 rounded-full px-3 text-xs font-bold'
const CARD_QUIET_TONE = 'text-brand-gray hover:text-brand-yellow hover:bg-brand-white/[0.06] transition-colors'

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

// ─── Navigation: the product menu and the family bar ───────────────────────
// Stuart, 23 Sep 2026: "it's hard to find products when i have to scroll right
// down for them". The page opens on a menu of every product and its entry
// price, each line a link to its card; among the cards a slim bar keeps every
// family one tap away. Clicks go through `onJump`, which brings back a card an
// objective or format filter has hidden before it scrolls.
// `goal`: undefined while no goal chip is on, then 'on' (the line matches the
// goal: highlighted) or 'off' (dimmed - still listed, still a link).
function MenuLine({ href, onClick, title, price, goal }) {
  return (
    <li className={`transition-opacity duration-200 ${goal === 'off' ? 'opacity-35' : ''}`}>
      <a href={href} onClick={onClick}
        className="group/row flex items-end gap-2 pl-10 pr-3 md:px-0 min-h-11 md:min-h-0 py-2.5 md:py-[6px] text-[13.5px] leading-snug">
        <span className={`${goal === 'on' ? 'text-brand-yellow font-semibold' : 'text-brand-white/85'} group-hover/row:text-brand-yellow transition-colors`}>{title}</span>
        <span className="flex-1 min-w-4 mb-[5px] border-b border-dotted border-brand-white/20 group-hover/row:border-brand-yellow/50 transition-colors" aria-hidden />
        <span className={`shrink-0 whitespace-nowrap tabular-nums ${price.out ? 'text-[12px] font-bold uppercase tracking-wider text-brand-gray' : 'font-bold text-brand-white'}`}>
          {price.from && <span className="mr-1 text-[11px] font-medium text-brand-gray">from</span>}{price.text}
        </span>
      </a>
    </li>
  )
}

// `hits`: with a goal chip on, how many of the family's products match it (the
// phone row shows the count; a family with none is dimmed).
function MenuBlock({ id, icon: Icon, label, from, open, onToggle, href, onJump, allLabel, hits = null, goal = null, dimmed = false, className = '', children }) {
  const dim = dimmed || hits === 0
  return (
    <div className={`break-inside-avoid border-b border-brand-white/8 last:border-b-0 md:border-b-0 md:mb-7 ${className}`}>
      {/* phone: the family is a row that opens its list */}
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={id}
        className={`md:hidden w-full flex items-center gap-3 px-3 min-h-[3.25rem] py-2 text-left transition-opacity duration-200 ${dim ? 'opacity-35' : ''}`}>
        <Icon className="w-4 h-4 text-brand-yellow shrink-0" aria-hidden />
        <span className="flex-1 min-w-0 text-[14px] font-bold text-brand-white leading-snug">{label}</span>
        {hits !== null && (
          <span className={`shrink-0 inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full text-[11px] font-black tabular-nums ${hits ? 'bg-brand-yellow text-brand-dark' : 'bg-brand-white/10 text-brand-gray'}`}>
            {hits}<span className="sr-only"> {hits === 1 ? 'product' : 'products'} for {goal}</span>
          </span>
        )}
        <span className="text-[12px] text-brand-gray tabular-nums whitespace-nowrap">{from || 'POA'}</span>
        <ChevronDown className={`w-4 h-4 text-brand-gray shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {/* desktop: the family heading links to its group */}
      <a href={href} onClick={(e) => onJump(e, href.slice(1))} className={`group/fam hidden md:flex items-center gap-2.5 mb-2 transition-opacity duration-200 ${dim ? 'opacity-35' : ''}`}>
        <span className="w-7 h-7 rounded-full bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0"><Icon className="w-3.5 h-3.5" aria-hidden /></span>
        <span className="text-[13.5px] font-black text-brand-white leading-tight group-hover/fam:text-brand-yellow transition-colors">{label}</span>
        <ArrowRight className="w-3 h-3 text-brand-gray/60 group-hover/fam:text-brand-yellow transition-colors ml-auto shrink-0" aria-hidden />
      </a>
      <ul id={id} className={`${open ? 'block' : 'hidden'} md:block pb-2 md:pb-0`}>
        {children}
        <li className="md:hidden">
          <a href={href} onClick={(e) => onJump(e, href.slice(1))}
            className="flex items-center gap-1.5 pl-10 pr-3 min-h-11 text-[11px] font-black uppercase tracking-[0.14em] text-brand-yellow">
            {allLabel} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </a>
        </li>
      </ul>
    </div>
  )
}

// ─── Goal chips ─────────────────────────────────────────────────────────────
// The rate card's own objective tags (`impact`, the same list as the Objective
// filter above the cards, whose behaviour is untouched): one chip at a time
// highlights the products for that goal and dims the rest - the menu still lists
// every product - and "Present these" opens a deck of just those products.
const cardHasGoal = (card, goal) => card.options.some((o) => o.impact.includes(goal))
const goalCount = (goal) => CARDS.reduce((n, g) => n + g.cards.filter((c) => cardHasGoal(c, goal)).length, 0)

function GoalChips({ goal, setGoal, onPresent }) {
  const n = goal ? goalCount(goal) : 0
  return (
    <div className="px-5 sm:px-8 py-4 border-b border-brand-white/10 bg-brand-white/[0.02]">
      <div role="group" aria-label="Show products for a goal" className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[11px] font-black uppercase tracking-[0.16em] text-brand-gray">Show products for</span>
        {impacts.map((t) => {
          const on = goal === t
          return (
            <button key={t} type="button" onClick={() => setGoal(on ? null : t)} aria-pressed={on}
              className={`inline-flex items-center min-h-10 sm:min-h-9 px-3.5 rounded-full border text-[12.5px] font-bold transition-colors ${on
                ? 'bg-brand-yellow border-brand-yellow text-brand-dark'
                : 'border-brand-white/20 text-brand-white/85 hover:border-brand-yellow/60 hover:text-brand-yellow'}`}>
              {t}
            </button>
          )
        })}
      </div>
      <div aria-live="polite">
        {goal && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-sm text-brand-white"><strong className="font-black text-brand-yellow tabular-nums">{n}</strong> product{n === 1 ? '' : 's'} for {goal}</p>
            <button type="button" onClick={() => onPresent('', goal)}
              className="inline-flex items-center gap-2 min-h-10 sm:min-h-9 px-4 rounded-full bg-brand-yellow text-brand-dark text-[12.5px] font-black hover:brightness-110 transition">
              <Presentation className="w-4 h-4" aria-hidden /> Present these
            </button>
            <button type="button" onClick={() => setGoal(null)}
              className="inline-flex items-center min-h-10 sm:min-h-9 text-[12.5px] font-bold text-brand-gray underline underline-offset-2 hover:text-brand-white">
              Show all
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ProductMenu({ onJump, onPresent }) {
  const [open, setOpen] = useState(null)
  const [goal, setGoal] = useState(null)
  const toggle = (k) => setOpen((v) => (v === k ? null : k))
  const lineGoal = (c) => (goal ? (cardHasGoal(c, goal) ? 'on' : 'off') : undefined)
  const ticketGoal = goal ? 'off' : undefined // tickets carry no goal tags
  const ticketFrom = `from ${fmtUsd(Math.min(...ticketLadder.map((t) => t.eb)))}`
  const ticketLines = ticketLadder.map((t) => (
    <MenuLine key={t.type} href={`#${ticketId(t)}`} onClick={(e) => onJump(e, ticketId(t))} title={t.type} price={{ from: true, text: fmtUsd(t.eb) }} goal={ticketGoal} />
  ))
  return (
    <section id="menu" aria-label="Rate card at a glance" className="jump-near relative bg-brand-dark pb-16 sm:pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="rounded-3xl border border-brand-white/12 bg-brand-white/[0.03] overflow-hidden shadow-[0_40px_90px_-30px_rgba(0,0,0,0.75)]">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 px-5 sm:px-8 pt-6 sm:pt-7 pb-5 sm:pb-6 border-b border-brand-white/10">
            <div className="min-w-0 max-w-2xl">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-yellow mb-2">Rate card at a glance</p>
              <p className="text-brand-white text-lg sm:text-2xl font-bold leading-snug">{CARD_COUNT} partnership products in {CARDS.length} families, plus delegate tickets</p>
              <p className="text-brand-gray text-[12.5px] sm:text-sm mt-1.5">Partnership prices in EUR, excluding VAT · ticket prices in USD · pick any line to open it</p>
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
          <GoalChips goal={goal} setGoal={setGoal} onPresent={onPresent} />
          <div className="px-2 sm:px-5 md:px-8 py-2 md:pt-7 md:pb-0 md:columns-2 lg:columns-3 md:gap-8 xl:gap-12">
            {CARDS.map(({ cat, cards }) => (
              <MenuBlock key={cat} id={`menu-${catId(cat)}`} icon={FAMILY_META[cat]?.icon || Layers} label={cat}
                from={familyFrom(cards)} open={open === cat} onToggle={() => toggle(cat)}
                hits={goal ? cards.filter((c) => cardHasGoal(c, goal)).length : null} goal={goal}
                href={`#${catId(cat)}`} onJump={onJump} allLabel={`Go to ${FAMILY_META[cat]?.short || cat}`}>
                {cards.map((c) => (
                  <MenuLine key={c.key} href={`#${productId(c)}`} onClick={(e) => onJump(e, productId(c))} title={c.title} price={menuPrice(c)} goal={lineGoal(c)} />
                ))}
              </MenuBlock>
            ))}
            {/* phone: tickets are one more row of the list */}
            <MenuBlock id="menu-tickets" icon={Ticket} label="Delegate Tickets" from={ticketFrom} className="md:hidden"
              dimmed={Boolean(goal)}
              open={open === 'tickets'} onToggle={() => toggle('tickets')} href="#tickets" onJump={onJump} allLabel="Go to Tickets">
              {ticketLines}
            </MenuBlock>
          </div>
          {/* wider screens: tickets run as one row under the families, so the columns above stay even */}
          <div className={`hidden md:block px-8 pt-5 pb-5 border-t border-brand-white/10 transition-opacity duration-200 ${goal ? 'opacity-35' : ''}`}>
            <a href="#tickets" onClick={(e) => onJump(e, 'tickets')} className="group/fam inline-flex items-center gap-2.5 mb-2.5">
              <span className="w-7 h-7 rounded-full bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0"><Ticket className="w-3.5 h-3.5" aria-hidden /></span>
              <span className="text-[13.5px] font-black text-brand-white group-hover/fam:text-brand-yellow transition-colors">Delegate Tickets</span>
              <span className="text-[11px] text-brand-gray">USD</span>
              <ArrowRight className="w-3 h-3 text-brand-gray/60 group-hover/fam:text-brand-yellow transition-colors shrink-0" aria-hidden />
            </a>
            <ul className="flex flex-wrap gap-x-9 gap-y-1">
              {ticketLadder.map((t) => (
                <li key={t.type}>
                  <a href={`#${ticketId(t)}`} onClick={(e) => onJump(e, ticketId(t))} className="group/row inline-flex items-baseline gap-2 py-1 text-[13.5px]">
                    <span className="text-brand-white/85 group-hover/row:text-brand-yellow transition-colors">{t.type}</span>
                    <span className="whitespace-nowrap tabular-nums font-bold text-brand-white"><span className="mr-1 text-[11px] font-medium text-brand-gray">from</span>{fmtUsd(t.eb)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 sm:px-8 py-3 sm:py-4 border-t border-brand-white/10 text-[11px] font-black uppercase tracking-[0.14em]">
            <span className="basis-full sm:basis-auto text-brand-gray/70">Also on this page</span>
            {[['Recognition', 'recognition'], ['About', 'about'], ['The Room', 'audience']].map(([t, id]) => (
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

// ─── Calculator panel ───────────────────────────────────────────────────────
function CalculatorPanel({ cart, onRemove, rebooking, setRebooking, open, setOpen }) {
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

function buildDeck({ goal = null, hasPlan = false }) {
  const groups = CARDS
    .map(({ cat, cards }) => ({ cat, cards: goal ? cards.filter((c) => cardHasGoal(c, goal)) : cards }))
    .filter((g) => g.cards.length)
  const slides = [{ id: 'cover', kind: 'cover', label: 'Cover', group: 'Start', groups }]
  if (!goal) {
    slides.push({ id: 'about', kind: 'about', label: 'Why partner', group: 'Start' })
    slides.push({ id: 'audience', kind: 'audience', label: "Who's in the room", group: 'Start' })
  }
  groups.forEach(({ cat, cards }) => {
    slides.push({ id: catId(cat), kind: 'family', label: cat, group: cat, cat, cards })
    cards.forEach((card) => slides.push({ id: productId(card), kind: card.options.length > 1 ? 'routes' : 'product', label: card.title, group: cat, cat, card }))
  })
  if (!goal) {
    slides.push({ id: 'tickets', kind: 'tickets', label: 'Delegate tickets', group: 'Tickets' })
    slides.push({ id: 'ticket-offers', kind: 'ticket-offers', label: 'Ticket offers', group: 'Tickets' })
    slides.push({ id: 'recognition', kind: 'recognition', label: 'Recognition levels', group: 'Recognition' })
    if (hasPlan) slides.push({ id: 'plan', kind: 'plan', label: 'Your selection', group: 'Your selection' })
  }
  slides.push({ id: 'next-steps', kind: 'next', label: 'Next steps', group: 'Next steps' })
  return slides
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

// the first `max` deliverables, then "+ N more on the card" (a way onto it)
function SlideDeliverables({ items, heading = 'What’s included', max = 6, onMore, small = false, cols = false, className = '' }) {
  if (!items.length) return null
  const shown = items.slice(0, max)
  const more = items.length - shown.length
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
      {more > 0 && (
        <button type="button" onClick={onMore}
          className="mt-2 -ml-1 inline-flex items-center gap-1.5 min-h-11 px-1 text-sm font-bold text-brand-yellow hover:text-brand-yellow/80 transition-colors">
          + {more} more on the card <ArrowRight className="w-3.5 h-3.5" aria-hidden />
        </button>
      )}
    </div>
  )
}

// The hero, then the whole deck as a table of contents: each family (by the
// short name its family-bar chip uses) with its product count, each a jump.
function CoverSlide({ slide, deck, goId }) {
  const { goal, cart } = deck
  const n = slide.groups.reduce((s, g) => s + g.cards.length, 0)
  const plural = (k, one) => `${k} ${one}${k === 1 ? '' : 's'}`
  const items = [
    ...(goal ? [] : [{ id: 'about', label: 'Why partner', icon: Users }]),
    ...slide.groups.map(({ cat, cards }) => ({ id: catId(cat), label: FAMILY_META[cat]?.short || cat, icon: FAMILY_META[cat]?.icon || Layers, count: plural(cards.length, 'product') })),
    ...(goal ? [] : [
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
          {goal && <p className="mt-5 text-2xl sm:text-3xl font-black leading-tight">{plural(n, 'product')} for <span className="text-brand-yellow">{goal}</span></p>}
          <p className="mt-5 flex items-start gap-2 text-base sm:text-lg text-brand-white/85">
            <MapPin className="w-5 h-5 mt-0.5 shrink-0 text-brand-yellow" aria-hidden />{VENUE_LINE}
          </p>
        </div>
        {!goal && (
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

function AudienceSlide() {
  return (
    <div>
      <SlideEyebrow>The room</SlideEyebrow>
      <h2 className="mt-3 text-4xl sm:text-5xl font-black uppercase tracking-tight leading-[1.05]">Who&rsquo;s In <span className="text-brand-yellow">The Room</span></h2>
      <p className="mt-4 max-w-3xl text-lg sm:text-xl leading-relaxed text-brand-white/80">{ROOM_LEDE}</p>
      <ul className="mt-7 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {AUDIENCE.map(([label, Icon]) => (
          <li key={label} className="flex items-center gap-3 rounded-xl border border-brand-white/10 bg-brand-white/5 px-3.5 py-3 sm:px-4 sm:py-4">
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 text-brand-yellow" aria-hidden />
            <span className="text-[11.5px] sm:text-sm font-bold uppercase tracking-wide leading-snug">{label}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {ROOM_PILLARS.map(([title, body]) => (
          <div key={title} className="rounded-xl border border-brand-white/10 bg-brand-white/[0.03] p-5">
            <p className="text-sm font-black uppercase text-brand-yellow">{title}</p>
            <p className="mt-2 text-sm leading-relaxed text-brand-gray">{body}</p>
          </div>
        ))}
      </div>
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
        <SlideEyebrow className="mt-6">{deck.goal ? `For ${deck.goal}` : 'Product family'}</SlideEyebrow>
        <h2 className="mt-3 text-4xl sm:text-5xl xl:text-6xl font-black uppercase leading-[1.02] tracking-tight text-balance">{slide.cat.replace(/-/g, '‑')}</h2>
        <p className="mt-5 text-lg sm:text-xl text-brand-gray">
          <strong className="font-black text-brand-white">{n} product{n === 1 ? '' : 's'}</strong>
          {from && <> · <span className="text-brand-white">{from}</span></>}
        </p>
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
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
      <div className="lg:col-span-7">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <SlideEyebrow>{card.cat}</SlideEyebrow>
          <StatusPill item={item} featured={card.featured} />
        </div>
        <h2 className={`mt-3 sm:mt-4 font-black leading-[1.03] tracking-tight text-balance ${card.title.length > 30 ? 'text-4xl sm:text-[2.75rem]' : 'text-4xl sm:text-5xl xl:text-[3.5rem]'}`}>{card.title}</h2>
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
      <div className="lg:col-span-5">
        <SlideDeliverables items={items} onMore={() => deck.openCard(id)} />
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
  const openId = deck.focusRoute || productId(card)
  // each route reads as about six lines, like a product slide: all of its own
  // lines, then the shared ones up to six (never fewer than two), then "+ N more"
  const ownMax = Math.max(...routes.map((r) => r.items.filter((l) => !common.includes(l)).length))
  const commonMax = Math.max(2, 6 - ownMax)
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
                <SlideDeliverables items={items.filter((l) => !common.includes(l))} heading="Only on this route" max={Infinity} small />
                <TermsList terms={terms.filter((t) => !commonTerms.some((c) => sameTerm(c, t)))} />
              </div>
            )
          })}
        </div>
        {side && (
          <div className={`${narrowSide ? 'xl:col-span-3' : 'xl:col-span-4'} xl:pt-1`}>
            <SlideDeliverables items={common} heading="Both routes include" max={commonMax} onMore={() => deck.openCard(openId)} small />
            <TermsList terms={commonTerms} />
          </div>
        )}
      </div>
      {wide && <SlideDeliverables items={common} heading="Both routes include" max={commonMax} onMore={() => deck.openCard(openId)} small cols className="mt-5" />}
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
// Section order is products first: hero → product menu → rate card →
// recognition → about → the room → tickets → rebooking. The story sections
// used to sit between the hero and the rate card, which put the first product
// seven phone screens down.
const AUDIENCE = [
  ['Prediction Market Platforms', LineChart],
  ['Exchanges & Trading Venues', Landmark],
  ['Market Makers & Traders', TrendingUp],
  ['Sportsbooks & Operators', Trophy],
  ['Data & Odds Providers', Cpu],
  ['Payments & Fintech', Banknote],
  ['Regulators & Legal', Scale],
  ['Media & Research', Newspaper],
]

export default function App() {
  const [activeImpact, setActiveImpact] = useState(null)
  const [activeType, setActiveType] = useState(null)
  const [cart, setCart] = useState([])
  const [rebooking, setRebooking] = useState(false)
  const [calcOpen, setCalcOpen] = useState(false)
  useScrollAnimation(`${activeImpact}|${activeType}`)

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
  // a goal deck keeps its goal here. The page stays mounted under the deck.
  const { present, open: openPresent, close: closePresent } = usePresent()
  const [deckGoal, setDeckGoal] = useState(null)
  const openDeck = useCallback((id = '', goal = null) => { setDeckGoal(goal); openPresent(id) }, [openPresent])
  const closeDeck = useCallback(() => { closePresent(); setDeckGoal(null) }, [closePresent])
  const hasPlan = cart.length > 0
  const slides = useMemo(() => buildDeck({ goal: deckGoal, hasPlan }), [deckGoal, hasPlan])
  const start = present === null ? null : deckStart(present, slides)
  const deck = {
    goal: deckGoal, cart, rebooking, cartCounts, conflictedIds,
    focusRoute: start?.route || null, focusTicket: start?.ticket || null,
    onAdd: addToCart, onRemove: removeFromCart,
    hasSlide: (id) => slides.some((s) => s.id === id),
    // leave the deck and land on the card (or section) on the page
    openCard: (id) => { closeDeck(); onJump(null, id) },
    openCalculator: () => { closeDeck(); setCalcOpen(true) },
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
          The bar fits one line at every width: below 380px the year steps
          aside; Present is an icon button below md and labelled from md; the
          Contact Sales pill is a round mail button below 500px; Tickets joins
          at lg (below it, the menu and the ticket section carry tickets). */}
      <nav ref={navRef} className="fixed top-0 left-0 w-full z-40 bg-brand-dark/95 backdrop-blur-md py-3 sm:py-4 shadow-lg border-b border-brand-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex justify-between items-center gap-3">
          <a href="#" className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0 h-10">
            <img alt="NEXTPredict" className="h-6 sm:h-8 lg:h-9 w-auto object-contain" src={`${base}logos/nextpredict-logo.png`} />
            <span className="hidden min-[380px]:inline font-black text-base sm:text-xl lg:text-2xl tracking-tight text-brand-yellow">2027</span>
          </a>
          <div className="flex items-center gap-2 min-[400px]:gap-3 sm:gap-4 md:gap-5 lg:gap-8">
            <a href="#pricing" onClick={(e) => onJump(e, 'pricing')}
              className="inline-flex items-center h-10 text-xs sm:text-sm font-bold uppercase tracking-wider sm:tracking-widest text-brand-white hover:text-brand-yellow transition-colors whitespace-nowrap">Rate Card</a>
            <a href="#tickets" onClick={(e) => onJump(e, 'tickets')}
              className="hidden lg:inline-flex items-center h-10 text-sm font-bold uppercase tracking-widest text-brand-white hover:text-brand-yellow transition-colors">Tickets</a>
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
        {/* ── HERO ── */}
        <section className="relative flex flex-col items-center justify-center overflow-hidden bg-brand-dark pt-28 sm:pt-36 pb-12 sm:pb-16">
          <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,rgba(255,207,51,0.14),transparent_55%)]" />
          <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-brand-dark to-transparent z-0" />
          <div className="z-10 text-center max-w-5xl px-4 sm:px-8 w-full">
            <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-yellow/30 bg-brand-yellow/10 text-brand-yellow text-[10px] min-[360px]:text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] sm:tracking-[0.2em] mb-7 sm:mb-8 whitespace-nowrap">
              <TrendingUp className="w-3.5 h-3.5 shrink-0" aria-hidden /> The Prediction Markets Summit
            </p>
            <h1 className="text-[clamp(2.75rem,14vw,8rem)] font-black tracking-tighter text-brand-white mb-4 sm:mb-6 leading-none">
              NEXT<span className="text-brand-yellow">Predict</span>
            </h1>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold text-brand-yellow mb-6 tracking-wide uppercase">October 2027</h2>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-brand-white/80 font-medium tracking-wide mb-9 sm:mb-10 uppercase text-[11px] sm:text-sm">
              <div className="flex items-center gap-2 bg-brand-white/5 py-2 px-3.5 sm:px-4 rounded-full border border-brand-white/10">
                <MapPin className="w-4 h-4 text-brand-yellow shrink-0" aria-hidden /> New York City
              </div>
              <div className="flex items-center gap-2 bg-brand-white/5 py-2 px-3.5 sm:px-4 rounded-full border border-brand-white/10">
                <CalendarDays className="w-4 h-4 text-brand-yellow shrink-0" aria-hidden /> Exact dates &amp; venue to be announced
              </div>
              <div className="flex items-center gap-2 bg-brand-white/5 py-2 px-3.5 sm:px-4 rounded-full border border-brand-white/10">
                <Layers className="w-4 h-4 text-brand-yellow shrink-0" aria-hidden /> 2 Days · 3 Stages
              </div>
            </div>
            <div className="bg-brand-yellow text-brand-dark py-4 px-6 md:py-6 md:px-12 inline-block rounded-2xl transform -skew-x-6 max-w-full">
              <h3 className="text-[clamp(1.1rem,5.6vw,3.75rem)] font-black uppercase tracking-tighter skew-x-6 leading-none whitespace-nowrap">Partnership Rate Card</h3>
            </div>
          </div>
        </section>

        {/* ── PRODUCT MENU ── */}
        <ProductMenu onJump={onJump} onPresent={openDeck} />

        {/* ── PRICING / RATE CARD ── */}
        <section id="pricing" className="jump-section relative bg-brand-dark pt-16 md:pt-20 border-t border-brand-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <SectionHead title="Partnership" accent="Rate Card"
              lede="Published prices in EUR, excluding VAT, all-in where stated. Where the same space is offered two ways, such as exclusive or shared, both routes sit on one card and you book one or the other.">
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
              return (
                <div key={cat} id={catId(cat)} data-cat={cat} className="jump-target mb-16 md:mb-20 last:mb-12">
                  <FamilyHeading cat={cat} count={cards.length} />
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

        {/* ── ABOUT ── */}
        <section id="about" className="jump-section py-20 md:py-24 bg-brand-dark relative border-b border-brand-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <SectionHead title="The Market Is Moving." sub="Own Your Position In The Category-Defining Event" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 mb-16 md:mb-20 items-center">
              <div data-anim style={anim}>
                <p className="text-lg md:text-xl text-brand-gray leading-relaxed">
                  Prediction markets moved from the margins to the mainstream - and NEXTPredict is where the
                  category meets. Platforms, exchanges, market makers, sportsbooks, data providers, payments,
                  regulators and the capital behind them, in one room, for two days in New York.
                  <br /><br />
                  This is not another iGaming expo with a new banner. It is a summit built for one category,
                  returning in October 2027 after its 2026 debut - where the <strong className="text-brand-yellow">Leadership Stage
                  partnership sold out</strong>.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4" data-anim style={anim}>
                {EVENT_STATS.map(([num, label], i) => (
                  <div key={i} className="text-center px-3 py-7 sm:py-8 rounded-xl bg-brand-white/5 border border-brand-white/10 group hover:border-brand-yellow/40 transition-all duration-300">
                    <p className="text-4xl sm:text-5xl font-black text-brand-white group-hover:text-brand-yellow transition-colors duration-300 mb-2 leading-none tabular-nums">{num}</p>
                    <p className="text-brand-gray text-[11px] sm:text-xs uppercase tracking-widest leading-snug">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* from lg the proof sits beside the argument instead of under it,
                so the box no longer ends in an empty right half */}
            <div className="bg-brand-white/5 border border-brand-white/10 rounded-3xl p-6 sm:p-10 md:p-12 relative overflow-hidden" data-anim style={anim}>
              <div className="absolute right-0 top-0 w-96 h-96 bg-brand-yellow/5 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 lg:items-center">
                <div className="lg:col-span-7 max-w-3xl">
                  <div className="inline-block bg-brand-yellow text-brand-dark font-bold px-4 py-1 rounded-sm mb-6 text-sm">WHY PARTNER</div>
                  <h4 className="text-[1.75rem] sm:text-3xl md:text-4xl font-bold text-brand-white mb-6 leading-tight">{WHY_PARTNER.title} <span className="text-brand-yellow">{WHY_PARTNER.accent}</span></h4>
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
        </section>

        {/* ── AUDIENCE ── */}
        <section id="audience" className="jump-section py-20 md:py-24 bg-brand-dark relative border-b border-brand-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <SectionHead title="Who's In" accent="The Room" lede={ROOM_LEDE} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {AUDIENCE.map(([label, Icon], i) => (
                <div key={label} data-anim style={{ ...anim, transitionDelay: `${i * 50}ms` }}
                  className="flex flex-col items-center justify-center gap-3 bg-brand-white/5 border border-brand-white/10 rounded-2xl px-3 sm:px-4 py-6 sm:py-8 hover:border-brand-yellow/50 hover:bg-brand-white/8 transition-all duration-300">
                  <Icon className="w-7 h-7 text-brand-yellow" aria-hidden />
                  <p className="text-[12px] sm:text-sm font-bold text-brand-white text-center uppercase tracking-wide leading-snug">{label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-10 md:mt-12" data-anim style={anim}>
              {ROOM_PILLARS.map(([title, body]) => (
                <div key={title} className="bg-brand-white/5 p-6 rounded-xl border border-brand-white/10 hover:border-brand-yellow transition-colors duration-300">
                  <h4 className="text-brand-yellow font-bold mb-3 uppercase">{title}</h4>
                  <p className="text-sm text-brand-gray leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TICKETS ── */}
        <TicketsSection />

        {/* ── REBOOKING / CTA ── */}
        <section className="py-20 md:py-24 bg-brand-dark relative">
          <div className="max-w-5xl mx-auto px-4 sm:px-8 text-center" data-anim style={anim}>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-yellow/10 border border-brand-yellow/20 rounded-full text-brand-yellow text-xs font-bold tracking-widest uppercase mb-8">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden /><span>2026 Partners</span>
            </div>
            <h2 className="text-[2rem] leading-[1.05] sm:text-4xl md:text-5xl font-black text-brand-white uppercase tracking-tight mb-6">Rebook Early. <span className="text-brand-yellow">Keep 15%.</span></h2>
            <p className="text-base md:text-lg text-brand-gray max-w-3xl mx-auto mb-10 leading-relaxed">
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

      <CalculatorPanel cart={cart} onRemove={removeFromCart} rebooking={rebooking} setRebooking={setRebooking} open={calcOpen} setOpen={setCalcOpen} />

      {start && (
        <PresentMode slides={slides} startId={start.id} onClose={closeDeck}
          title={deckGoal ? `2027 · ${deckGoal}` : '2027 · Partnership Rate Card'}
          label={`NEXTPredict 2027 ${deckGoal ? `${deckGoal} products` : 'partnership rate card'}`}
          logo={<img alt="NEXTPredict" src={`${base}logos/nextpredict-logo.png`} className="h-5 sm:h-6 w-auto shrink-0" />}
          renderSlide={(s, ctx) => renderDeckSlide(s, deck, ctx)} />
      )}
    </div>
  )
}
