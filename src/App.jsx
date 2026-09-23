import { useState, useEffect, useCallback } from 'react'
import {
  Mail, Calculator, Download, X, TrendingUp, CalendarDays, MapPin,
  CircleCheck, ChevronDown, ShieldCheck, Ticket, Layers, Users,
  LineChart, Landmark, Scale, Cpu, Newspaper, Banknote, Trophy, Sparkles
} from 'lucide-react'

const base = import.meta.env.BASE_URL

const fmtPrice = (n) => `€${n.toLocaleString('en-US')}`

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

// ─── PDF proposal generator ─────────────────────────────────────────────────
function downloadProposalPDF(cart, rebooking) {
  const total = cart.reduce((s, i) => s + (i.poa ? 0 : (rebooking ? Math.round(i.price * 0.85) : i.price)), 0)
  const tier = resolveTier(total, cart)
  const nextTier = nextSpendTier(total, cart)
  const tierColors = { Silver: '#9ca3af', Gold: '#f59e0b', Platinum: '#93c5fd', Diamond: '#cffafe', Headline: '#ffcf33' }
  const tierColor = tierColors[tier.name] || '#ffcf33'
  const rows = cart.map((item) => {
    const p = rebooking ? Math.round(item.price * 0.85) : item.price
    const bulletItems = item.bullets
      ? item.bullets.split('\n').map((b) => b.trim()).filter(Boolean)
          .map((b) => `<li style="margin-bottom:3px">${b.replace(/^📅|^⚠️/, '').trim()}</li>`).join('')
      : ''
    const bulletsHtml = bulletItems
      ? `<ul style="margin:8px 0 0 0;padding-left:18px;font-size:12px;color:#555;line-height:1.6;list-style:disc">${bulletItems}</ul>`
      : ''
    return `<tr>
      <td style="padding:12px 16px;border-bottom:1px solid #e5e5e5;vertical-align:top">
        <div style="font-weight:600">${item.title}</div>
        <div style="font-size:12px;color:#888;margin-top:2px">${item.cat}</div>
        ${bulletsHtml}
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #e5e5e5;text-align:right;font-weight:700;vertical-align:top;white-space:nowrap">${item.poa ? 'POA' : '&#8364;' + p.toLocaleString('en-US')}</td>
    </tr>`
  }).join('')
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>NEXTPredict 2027 - Partnership Proposal</title>
  <script>window.addEventListener('load',function(){setTimeout(function(){window.print()},500)});<\/script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;background:#fff}
    .header{background:#242426;color:#fff;padding:48px 48px 40px}
    .logo{font-size:26px;font-weight:900;text-transform:uppercase;letter-spacing:-0.5px;margin-bottom:6px}
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
    .total td{background:#242426;color:#fff;padding:16px;font-weight:900;font-size:15px}
    .total td:last-child{text-align:right;color:#ffcf33;font-size:20px}
    .footer{padding:32px 48px;border-top:3px solid #ffcf33;margin-top:40px}
    .footer p{font-size:13px;color:#666;line-height:1.7}
    .footer strong{color:#1a1a1a}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
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
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 120000)
}

// ─── Full rate card PDF ─────────────────────────────────────────────────────
function downloadRateCardPDF() {
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const cats = [...new Set(pricing.map((p) => p.cat))]
  const body = cats.map((cat) => {
    const items = pricing.filter((p) => p.cat === cat)
    const rows = items.map((item) => {
      const lines = item.bullets.split('\n')
      const lis = lines.map((l) => {
        if (l.startsWith('📅')) return `<li class="note">${esc(l.slice(2).trim())}</li>`
        if (l.startsWith('⚠️')) return `<li class="warn">${esc(l.slice(2).trim())}</li>`
        return `<li>${esc(l)}</li>`
      }).join('')
      const availLabel = item.status === 'sold' ? 'SOLD' : item.status === 'reserved' ? 'RESERVED'
        : item.exclusive ? 'Exclusive' : item.avail ? `${item.avail} available` : ''
      return `<div class="product">
        <div class="phead"><div><h3>${esc(item.title)}</h3><span class="avail">${availLabel}</span></div>
        <div class="price">${item.poa ? 'POA' : '&#8364;' + item.price.toLocaleString('en-US')}</div></div>
        <p class="quote">${esc(item.quote.replace(/^"|"$/g, ''))}</p>
        <ul>${lis}</ul>
      </div>`
    }).join('')
    return `<section><h2>${esc(cat)}</h2>${rows}</section>`
  }).join('')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>NEXTPredict 2027 - Partnership Rate Card</title>
  <script>window.addEventListener('load',function(){setTimeout(function(){window.print()},600)});<\/script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;background:#fff;font-size:12px;line-height:1.5}
    .cover{background:#242426;color:#fff;padding:56px 48px}
    .cover h1{font-size:30px;font-weight:900;text-transform:uppercase;letter-spacing:-0.5px}
    .cover h1 span{color:#ffcf33}
    .cover p{color:#888888;margin-top:8px;font-size:13px}
    section{padding:28px 48px 8px;page-break-before:auto}
    h2{font-size:18px;font-weight:900;text-transform:uppercase;border-bottom:3px solid #ffcf33;padding-bottom:6px;margin-bottom:16px;page-break-after:avoid}
    .product{border:1px solid #e5e5e5;border-radius:8px;padding:14px 16px;margin-bottom:14px;page-break-inside:avoid}
    .phead{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
    .phead h3{font-size:14px;font-weight:800;display:inline}
    .avail{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#996c00;background:#fff6da;border-radius:4px;padding:2px 8px;margin-left:8px;white-space:nowrap}
    .price{font-size:16px;font-weight:900;white-space:nowrap}
    .quote{font-style:italic;color:#555;margin:6px 0 8px}
    ul{padding-left:18px}
    li{margin-bottom:2px}
    li.note{list-style:none;margin-left:-18px;background:#fff8e1;border:1px solid #f2dd9a;border-radius:4px;padding:3px 8px;font-size:11px;margin-top:4px}
    li.warn{list-style:none;margin-left:-18px;background:#fdecec;border:1px solid #f3b8b8;border-radius:4px;padding:3px 8px;font-size:11px;margin-top:4px}
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
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 120000)
}

// ─── Scroll animation hook ──────────────────────────────────────────────────
function useScrollAnimation() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.style.opacity = '1'
          e.target.style.transform = 'none'
          observer.unobserve(e.target)
        }
      }),
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    )
    document.querySelectorAll('[data-anim]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
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
const ticketLadder = [
  { type: 'VIP', eb: 2199, std: 2999, late: 3399, note: 'Premium all-event access with first-priority networking.' },
  { type: 'Full Event', eb: 1299, std: 1799, late: 2099, note: 'The core pass: full programme plus the main networking events.' },
  { type: 'Conference Only', eb: 949, std: 1249, late: 1449, note: 'Both conference days, without the evening networking programme.' },
  { type: 'Day Pass', eb: 779, std: 1079, late: 1259, note: 'One event day of your choice, including that evening’s event.' },
  { type: 'Operator & Regulator', eb: 650, std: 900, late: 1050, note: 'Verified operators and regulators. Verification required at checkout.' },
]

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

// ─── Deliverables List (collapsible) ────────────────────────────────────────
function DeliverablesList({ bullets, textClass = 'text-brand-white/90', spacing = 'space-y-3', collapsedCount = 5 }) {
  const [expanded, setExpanded] = useState(false)
  const lines = bullets.split('\n')
  const visible = expanded ? lines : lines.slice(0, collapsedCount)
  const hiddenCount = lines.length - collapsedCount

  const renderLine = (line, i) => {
    if (line.startsWith('📅')) return (
      <li key={i} className="flex items-center gap-2 bg-brand-yellow/8 border border-brand-yellow/20 rounded-lg px-3 py-2 text-xs text-brand-yellow/90 font-medium">
        <CalendarDays className="w-3.5 h-3.5 shrink-0 text-brand-yellow" aria-hidden />
        <span>{line.slice(2).trim()}</span>
      </li>
    )
    if (line.startsWith('⚠️')) return (
      <li key={i} className="flex items-start gap-2 bg-red-500/8 border border-red-500/25 rounded-lg px-3 py-2 text-xs text-red-300/90 font-medium">
        <span className="shrink-0 mt-0.5">⚠️</span>
        <span>{line.slice(2).trim()}</span>
      </li>
    )
    return (
      <li key={i} className={`flex items-start text-sm ${textClass}`}>
        <CircleCheck className="text-brand-yellow mr-3 shrink-0 mt-0.5 w-4 h-4" aria-hidden />
        <span className="leading-relaxed">{line}</span>
      </li>
    )
  }

  return (
    <>
      <ul className={spacing}>{visible.map(renderLine)}</ul>
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-yellow hover:text-brand-yellow/80 transition-colors"
        >
          {expanded ? 'Show less' : `Show ${hiddenCount} more`}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} aria-hidden />
        </button>
      )}
    </>
  )
}

// ─── Pricing cards ──────────────────────────────────────────────────────────
function cardCtaLabel(item, { atLimit, conflicted }) {
  if (item.status === 'sold') return 'Sold Out'
  if (item.status === 'reserved') return 'Reserved'
  if (conflicted) return 'Unavailable With Selection'
  if (atLimit) return item.exclusive ? 'Added' : `All ${item.avail} Added`
  return 'Add to Calculator'
}

function FeaturedPricingCard({ item, onAdd, rebooking, cartCount = 0, conflicted = false }) {
  const discountedPrice = Math.round(item.price * 0.85)
  const max = item.exclusive ? 1 : (item.avail ?? Infinity)
  const atLimit = cartCount >= max || item.status === 'sold' || item.status === 'reserved' || conflicted
  return (
    <div className="col-span-full relative overflow-hidden rounded-2xl border border-brand-yellow/40 bg-gradient-to-br from-brand-yellow/[0.18] via-brand-dark/95 to-brand-dark group hover:border-brand-yellow/70 transition-all duration-300 shadow-[0_0_60px_rgba(255,207,51,0.08)] hover:shadow-[0_0_80px_rgba(255,207,51,0.16)]">
      <div className="absolute top-0 left-0 w-80 h-80 bg-brand-yellow/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-0 bg-brand-yellow text-brand-dark text-[10px] font-black uppercase tracking-widest px-5 py-2 rounded-bl-xl z-20 shadow-md">✦ {item.exclusive ? 'Exclusive' : 'Featured'}</div>
      <div className="relative z-10 p-8 md:p-10 flex flex-col lg:flex-row gap-8 lg:gap-14">
        <div className="lg:w-5/12">
          <h4 className="text-3xl md:text-4xl font-black text-brand-white mb-5 leading-tight pr-4">{item.title}</h4>
          {item.poa ? (
            <p className="text-4xl md:text-5xl font-black text-brand-yellow mb-5 leading-none">POA</p>
          ) : rebooking ? (
            <div className="mb-5">
              <p className="text-xl text-brand-gray/50 line-through">{fmtPrice(item.price)}</p>
              <p className="text-4xl md:text-5xl font-black text-brand-yellow leading-none">{fmtPrice(discountedPrice)}</p>
              <p className="text-xs text-brand-yellow/70 font-semibold mt-1.5 uppercase tracking-wide">15% rebooking rate applied</p>
            </div>
          ) : (
            <p className="text-4xl md:text-5xl font-black text-brand-yellow mb-5 leading-none">{fmtPrice(item.price)}</p>
          )}
          <div className="mb-6 relative">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-brand-yellow/60 rounded-full" />
            <p className="text-brand-gray/80 italic leading-relaxed text-sm pl-4">{item.quote.replace(/^"|"$/g, '')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {item.impact.map((t) => (
              <span key={t} className="px-2 py-1 bg-brand-white/10 text-brand-white text-[10px] uppercase tracking-wider rounded-md font-medium">{t}</span>
            ))}
            {item.type.map((t) => (
              <span key={t} className="px-2 py-1 bg-brand-yellow/20 text-brand-yellow text-[10px] uppercase tracking-wider rounded-md font-medium">{t}</span>
            ))}
          </div>
        </div>
        <div className="lg:w-7/12 flex flex-col">
          <div className="flex-1">
            <DeliverablesList bullets={item.bullets} textClass="text-brand-white/90" spacing="space-y-3" />
          </div>
          <div className="mt-8 pt-6 border-t border-brand-white/10">
            <button
              onClick={() => onAdd(item)}
              disabled={atLimit}
              className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all duration-300 flex items-center justify-center gap-2 ${atLimit ? 'bg-brand-yellow/30 text-brand-yellow cursor-not-allowed' : 'bg-brand-yellow text-brand-dark hover:brightness-110 shadow-[0_0_20px_rgba(255,207,51,0.3)]'}`}
            >
              <Calculator className="w-4 h-4" />
              {cardCtaLabel(item, { atLimit, conflicted })}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PricingCard({ item, onAdd, rebooking, cartCount = 0, conflicted = false }) {
  const discountedPrice = Math.round(item.price * 0.85)
  const max = item.exclusive ? 1 : (item.avail ?? Infinity)
  const atLimit = cartCount >= max || item.status === 'sold' || item.status === 'reserved' || conflicted
  const availLabel = item.status === 'sold' ? 'Sold Out' : item.status === 'reserved' ? 'Reserved'
    : item.exclusive ? 'Exclusive' : item.avail ? `${item.avail} Available` : null
  return (
    <div className={`relative flex flex-col rounded-2xl border bg-brand-white/5 transition-all duration-300 overflow-hidden ${item.status === 'sold' ? 'border-brand-white/5 opacity-50' : 'border-brand-white/10 hover:border-brand-yellow/50 hover:bg-brand-white/10 hover:shadow-[0_0_40px_rgba(255,207,51,0.08)]'}`}>
      {availLabel && (
        <div className={`absolute top-0 right-0 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-xl z-10 ${item.status === 'sold' ? 'bg-red-500/80 text-white' : item.status === 'reserved' ? 'bg-amber-500/90 text-brand-dark' : 'bg-brand-white/10 text-brand-gray'}`}>
          {availLabel}
        </div>
      )}
      <div className="p-6 md:p-7 flex flex-col flex-1">
        <h4 className="text-xl font-black text-brand-white mb-3 leading-snug pr-20">{item.title}</h4>
        {item.poa ? (
          <p className="text-3xl font-black text-brand-yellow mb-4 leading-none">POA</p>
        ) : rebooking ? (
          <div className="mb-4">
            <p className="text-sm text-brand-gray/50 line-through">{fmtPrice(item.price)}</p>
            <p className="text-3xl font-black text-brand-yellow leading-none">{fmtPrice(discountedPrice)}</p>
          </div>
        ) : (
          <p className="text-3xl font-black text-brand-yellow mb-4 leading-none">{fmtPrice(item.price)}</p>
        )}
        <p className="text-brand-gray/80 italic text-xs leading-relaxed mb-4 border-l-2 border-brand-yellow/40 pl-3">{item.quote.replace(/^"|"$/g, '')}</p>
        <div className="flex-1">
          <DeliverablesList bullets={item.bullets} textClass="text-brand-white/80" spacing="space-y-2" collapsedCount={4} />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-4 mb-5">
          {item.impact.map((t) => (
            <span key={t} className="px-2 py-0.5 bg-brand-white/8 text-brand-gray text-[9px] uppercase tracking-wider rounded font-medium">{t}</span>
          ))}
        </div>
        <button
          onClick={() => onAdd(item)}
          disabled={atLimit}
          className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all duration-300 flex items-center justify-center gap-2 ${atLimit ? 'bg-brand-white/10 text-brand-gray cursor-not-allowed' : 'bg-brand-yellow/15 text-brand-yellow border border-brand-yellow/40 hover:bg-brand-yellow hover:text-brand-dark'}`}
        >
          <Calculator className="w-3.5 h-3.5" />
          {cardCtaLabel(item, { atLimit, conflicted })}
        </button>
      </div>
    </div>
  )
}

// ─── Tickets section ────────────────────────────────────────────────────────
function TicketsSection({ anim }) {
  return (
    <section id="tickets" className="py-24 bg-brand-dark relative border-b border-brand-white/10">
      <div className="max-w-7xl mx-auto px-8">
        <div className="text-center mb-14" data-anim style={anim}>
          <h2 className="text-4xl md:text-5xl font-bold text-brand-yellow mb-4 uppercase">Delegate Tickets</h2>
          <p className="text-brand-gray max-w-3xl mx-auto">
            Three published price stages: <strong className="text-brand-white">Early Bird</strong>, <strong className="text-brand-white">Standard</strong> and <strong className="text-brand-white">Late</strong>.
            Early Bird pricing goes live on <strong className="text-brand-white">16 November 2026</strong>. Each stage closes on its published date or when its allocation
            sells out, whichever comes first - and prices never come back down.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-brand-white/10 mb-8" data-anim style={anim}>
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="bg-brand-dark text-[11px] uppercase tracking-widest text-brand-gray">
                <th className="px-6 py-4 font-bold">Ticket</th>
                <th className="px-6 py-4 font-bold text-brand-yellow">Early Bird</th>
                <th className="px-6 py-4 font-bold">Standard</th>
                <th className="px-6 py-4 font-bold">Late</th>
                <th className="px-6 py-4 font-bold hidden md:table-cell">Access</th>
              </tr>
            </thead>
            <tbody>
              {ticketLadder.map((t) => (
                <tr key={t.type} className="border-t border-brand-white/8 hover:bg-brand-white/[0.03] transition-colors">
                  <td className="px-6 py-4 font-bold text-brand-white whitespace-nowrap">{t.type}</td>
                  <td className="px-6 py-4 font-semibold text-brand-yellow whitespace-nowrap">${t.eb.toLocaleString('en-US')}</td>
                  <td className="px-6 py-4 text-brand-white/90 whitespace-nowrap">${t.std.toLocaleString('en-US')}</td>
                  <td className="px-6 py-4 text-brand-white/90 whitespace-nowrap">${t.late.toLocaleString('en-US')}</td>
                  <td className="px-6 py-4 text-xs text-brand-gray hidden md:table-cell">{t.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-anim style={anim}>
          <div className="bg-brand-white/5 border border-brand-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-brand-yellow" aria-hidden />
              <h4 className="font-black text-brand-white uppercase text-sm tracking-wide">Team of Three</h4>
            </div>
            <p className="text-sm text-brand-gray leading-relaxed">
              Bring your team: three Full Event passes at <strong className="text-brand-yellow">15% off</strong> the prevailing Full Event stage price.
              Available in every stage. Not combinable with any other offer.
            </p>
          </div>
          <div className="bg-brand-white/5 border border-brand-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-brand-yellow" aria-hidden />
              <h4 className="font-black text-brand-white uppercase text-sm tracking-wide">Start-Up Pass</h4>
            </div>
            <p className="text-sm text-brand-gray leading-relaxed">
              A gated flat rate for qualifying start-ups - application-based, capped for the event and limited to one per company.
              Apply via <a className="text-brand-yellow font-semibold" href="mailto:sales@next.io?subject=NEXTPredict 2027 Start-Up Pass">sales@next.io</a>.
            </p>
          </div>
          <div className="bg-brand-white/5 border border-brand-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Scale className="w-5 h-5 text-brand-yellow" aria-hidden />
              <h4 className="font-black text-brand-white uppercase text-sm tracking-wide">Operators & Regulators</h4>
            </div>
            <p className="text-sm text-brand-gray leading-relaxed">
              Verified operators and regulators attend at the preferential rate above - roughly half the Full Event price at every stage.
              Verification is confirmed before the ticket is issued.
            </p>
          </div>
        </div>

        <p className="text-center text-brand-gray text-xs mt-8 opacity-70" data-anim style={anim}>
          Ticket prices in USD. Conference Only excludes the evening networking programme. VIP includes first-priority access to speed networking.
        </p>
      </div>
    </section>
  )
}

// ─── Calculator panel ───────────────────────────────────────────────────────
function CalculatorPanel({ cart, onRemove, rebooking, setRebooking, open, setOpen }) {
  const total = cart.reduce((s, i) => s + (i.poa ? 0 : (rebooking ? Math.round(i.price * 0.85) : i.price)), 0)
  const tier = resolveTier(total, cart)
  const next = nextSpendTier(total, cart)
  return (
    <>
      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-brand-dark/95 backdrop-blur-md border-t border-brand-yellow/30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <TierProgress total={total} cart={cart} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Calculator className="w-5 h-5 text-brand-yellow shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-brand-gray font-bold">Your Selection · {cart.length} item{cart.length === 1 ? '' : 's'}</p>
              <p className="font-black text-brand-white text-lg leading-tight truncate">
                {fmtPrice(total)} <span className={`text-xs font-bold uppercase ${tier.color}`}>· {tier.name} Partner</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setOpen(!open)}
              className="px-4 py-2.5 rounded-xl border border-brand-white/20 text-brand-white text-xs font-bold uppercase tracking-widest hover:border-brand-yellow transition-colors">
              {open ? 'Close' : 'Review'}
            </button>
            <a href={buildMailto(cart, rebooking)}
              className="px-4 py-2.5 rounded-xl bg-brand-yellow text-brand-dark text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" aria-hidden /> Enquire
            </a>
          </div>
        </div>
      </div>

      {/* Slide-over */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-label="Investment calculator">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md bg-brand-dark border-l border-brand-white/10 h-full overflow-y-auto p-6 pb-40">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-brand-white uppercase">Investment Calculator</h3>
              <button onClick={() => setOpen(false)} className="text-brand-gray hover:text-brand-white" aria-label="Close calculator"><X className="w-6 h-6" /></button>
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
                  <li key={idx} className="flex items-start justify-between gap-3 bg-brand-white/5 border border-brand-white/10 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-brand-white leading-snug">{item.title}</p>
                      <p className="text-xs text-brand-gray mt-0.5">{item.cat}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-brand-yellow">{item.poa ? 'POA' : fmtPrice(rebooking ? Math.round(item.price * 0.85) : item.price)}</p>
                      <button onClick={() => onRemove(idx)} className="text-[10px] uppercase tracking-widest text-brand-gray hover:text-red-400 font-bold mt-1">Remove</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t border-brand-white/10 pt-4 space-y-1 mb-6">
              <div className="flex justify-between text-sm text-brand-gray"><span>Recognition level</span><span className={`font-black uppercase ${tier.color}`}>{tier.name} Partner</span></div>
              {next && <div className="flex justify-between text-xs text-brand-gray/70"><span>Next level</span><span>{fmtPrice(next.min - total)} to {next.name}</span></div>}
              <div className="flex justify-between text-lg font-black text-brand-white pt-2"><span>Total</span><span className="text-brand-yellow">{fmtPrice(total)}</span></div>
            </div>
            <div className="space-y-3">
              <a href={buildMailto(cart, rebooking)}
                className="w-full py-3.5 rounded-xl bg-brand-yellow text-brand-dark font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all">
                <Mail className="w-4 h-4" aria-hidden /> Contact Sales
              </a>
              <button onClick={() => downloadProposalPDF(cart, rebooking)} disabled={!cart.length}
                className={`w-full py-3.5 rounded-xl border font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all ${cart.length ? 'border-brand-yellow/50 text-brand-yellow hover:bg-brand-yellow/10' : 'border-brand-white/10 text-brand-gray cursor-not-allowed'}`}>
                <Download className="w-4 h-4" aria-hidden /> Download Proposal PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── App ────────────────────────────────────────────────────────────────────
export default function App() {
  useScrollAnimation()

  const [activeImpact, setActiveImpact] = useState(null)
  const [activeType, setActiveType] = useState(null)
  const [cart, setCart] = useState([])
  const [rebooking, setRebooking] = useState(false)
  const [calcOpen, setCalcOpen] = useState(false)

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

  const cartCounts = cart.reduce((acc, i) => { acc[i.id] = (acc[i.id] || 0) + 1; return acc }, {})
  const conflictedIds = new Set(cart.flatMap((i) => CONFLICTS[i.id] || []))

  const filtered = pricing.filter((p) => {
    const impactOk = !activeImpact || p.impact.includes(activeImpact)
    const typeOk = !activeType || p.type.includes(activeType)
    return impactOk && typeOk
  })
  const filteredByCategory = categories
    .map((cat) => ({ cat, items: filtered.filter((p) => p.cat === cat) }))
    .filter((g) => g.items.length > 0)

  const anim = { opacity: 0, transform: 'translateY(20px)', transition: 'opacity .6s ease, transform .6s ease' }

  const audience = [
    ['Prediction Market Platforms', LineChart],
    ['Exchanges & Trading Venues', Landmark],
    ['Market Makers & Traders', TrendingUp],
    ['Sportsbooks & Operators', Trophy],
    ['Data & Odds Providers', Cpu],
    ['Payments & Fintech', Banknote],
    ['Regulators & Legal', Scale],
    ['Media & Research', Newspaper],
  ]

  return (
    <div className="min-h-screen bg-brand-dark text-brand-white font-sans selection:bg-brand-yellow selection:text-brand-dark pb-24">

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 w-full z-40 bg-brand-dark/95 backdrop-blur-md py-4 shadow-lg border-b border-brand-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex justify-between items-center gap-3">
          <a href="#" className="flex items-center gap-3 shrink-0">
            <img alt="NEXTPredict" className="h-7 sm:h-9 object-contain" src={`${base}logos/nextpredict-logo.png`} />
            <span className="font-black text-lg sm:text-2xl uppercase tracking-tight text-brand-yellow">2027</span>
          </a>
          <div className="flex items-center gap-4 sm:gap-8">
            <a href="#pricing" className="text-sm font-bold uppercase tracking-widest text-brand-white hover:text-brand-yellow transition-colors hidden md:block">Rate Card</a>
            <a href="#tickets" className="text-sm font-bold uppercase tracking-widest text-brand-white hover:text-brand-yellow transition-colors hidden md:block">Tickets</a>
            <a href="mailto:sales@next.io?subject=I'm interested in NEXTPredict 2027 partnerships!"
              className="bg-brand-yellow text-brand-dark px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm uppercase tracking-widest hover:bg-white transition-colors whitespace-nowrap">
              Contact Sales
            </a>
          </div>
        </div>
      </nav>

      <main>
        {/* ── HERO ── */}
        <section className="relative min-h-[86vh] flex flex-col items-center justify-center overflow-hidden bg-brand-dark pt-24">
          <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,rgba(255,207,51,0.14),transparent_55%)]" />
          <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-brand-dark to-transparent z-0" />
          <div className="z-10 text-center max-w-5xl px-8 w-full">
            <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-yellow/30 bg-brand-yellow/10 text-brand-yellow text-xs font-bold uppercase tracking-[0.2em] mb-8">
              <TrendingUp className="w-3.5 h-3.5" aria-hidden /> The Prediction Markets Summit
            </p>
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-brand-white mb-6 uppercase leading-none">
              NEXT<span className="text-brand-yellow">Predict</span>
            </h1>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold text-brand-yellow mb-6 tracking-wide uppercase">October 2027</h2>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-brand-white/80 font-medium tracking-wide mb-10 uppercase text-sm md:text-base">
              <div className="flex items-center gap-2 bg-brand-white/5 py-2 px-4 rounded-full border border-brand-white/10">
                <MapPin className="w-4 h-4 text-brand-yellow" aria-hidden /> New York City
              </div>
              <div className="flex items-center gap-2 bg-brand-white/5 py-2 px-4 rounded-full border border-brand-white/10">
                <CalendarDays className="w-4 h-4 text-brand-yellow" aria-hidden /> Exact dates &amp; venue announced soon
              </div>
              <div className="flex items-center gap-2 bg-brand-white/5 py-2 px-4 rounded-full border border-brand-white/10">
                <Layers className="w-4 h-4 text-brand-yellow" aria-hidden /> 2 Days · 3 Stages
              </div>
            </div>
            <div className="bg-brand-yellow text-brand-dark py-4 px-6 md:py-6 md:px-12 inline-block rounded-2xl transform -skew-x-6 mb-10 max-w-full">
              <h3 className="text-2xl sm:text-4xl md:text-6xl font-black uppercase tracking-tighter skew-x-6">Partnership Rate Card</h3>
            </div>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-6">
              {[['About', '#about'], ['The Room', '#audience'], ['Rate Card', '#pricing'], ['Tickets', '#tickets'], ['Recognition', '#recognition']].map(([s, href]) => (
                <a key={s} href={href}
                  className="text-brand-white hover:text-brand-yellow font-bold uppercase tracking-widest text-sm transition-colors border border-brand-white/20 hover:border-brand-yellow px-6 py-3 rounded-full bg-brand-dark/50 backdrop-blur-sm">
                  {s}
                </a>
              ))}
            </div>
          </div>
        </section>


        {/* ── ABOUT ── */}
        <section id="about" className="py-24 bg-brand-dark relative border-b border-brand-white/10">
          <div className="max-w-7xl mx-auto px-8">
            <div data-anim style={anim}>
              <h2 className="text-4xl md:text-5xl font-bold text-brand-yellow mb-2 uppercase">The Market Is Moving.</h2>
              <h3 className="text-3xl md:text-4xl font-bold text-brand-white mb-16 uppercase">Own Your Position In The Category-Defining Event</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
              <div data-anim style={anim}>
                <p className="text-xl text-brand-gray leading-relaxed">
                  Prediction markets moved from the margins to the mainstream - and NEXTPredict is where the
                  category meets. Platforms, exchanges, market makers, sportsbooks, data providers, payments,
                  regulators and the capital behind them, in one room, for two days in New York.
                  <br /><br />
                  This is not another iGaming expo with a new banner. It is a summit built for one category,
                  returning in October 2027 after its 2026 debut - where the <strong className="text-brand-yellow">Leadership Stage
                  partnership sold out</strong>.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4" data-anim style={anim}>
                {[
                  ['2', 'Event Days'],
                  ['3', 'Content Stages'],
                  ['12+', 'Exhibition Positions'],
                  ['3', 'NEXTworking Evenings'],
                ].map(([num, label], i) => (
                  <div key={i} className="text-center px-3 py-8 rounded-xl bg-brand-white/5 border border-brand-white/10 group hover:border-brand-yellow/40 transition-all duration-300">
                    <p className="text-5xl font-black text-brand-white group-hover:text-brand-yellow transition-colors duration-300 mb-2 leading-none">{num}</p>
                    <p className="text-brand-gray text-xs uppercase tracking-widest leading-snug">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-brand-white/5 border border-brand-white/10 rounded-3xl p-10 md:p-12 relative overflow-hidden" data-anim style={anim}>
              <div className="absolute right-0 top-0 w-96 h-96 bg-brand-yellow/5 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 max-w-3xl">
                <div className="inline-block bg-brand-yellow text-brand-dark font-bold px-4 py-1 rounded-sm mb-6 text-sm">WHY PARTNER</div>
                <h4 className="text-3xl md:text-4xl font-bold text-brand-white mb-6">First-Mover Positioning. <span className="text-brand-yellow">A Verified Room.</span></h4>
                <p className="text-lg text-brand-gray leading-relaxed">
                  The demand side is curated on purpose: market makers and traders are hosted, and operators and
                  regulators attend on verified preferential rates - so the room your team works is the room you
                  are paying to meet. Partner visibility runs across the venue, the livestream, NEXT's digital
                  reach (a ~40k LinkedIn following and the daily newsletter database) and the official aftermovie.
                </p>
                <p className="text-lg text-brand-gray leading-relaxed mt-4">
                  A new event, but not an unproven team - partners score the NEXT Summit editions far above the
                  industry norm:
                </p>
                <div className="grid grid-cols-3 gap-4 mt-6 max-w-xl">
                  {[
                    ['+69', 'Partner NPS · Valletta 2026', true],
                    ['+62', 'Partner NPS · New York 2026', true],
                    ['+27', 'Industry Benchmark', false],
                  ].map(([num, label, ours], i) => (
                    <div key={i} className="text-center px-3 py-5 rounded-xl bg-brand-white/5 border border-brand-white/10">
                      <p className={`text-3xl font-bold mb-1 leading-none ${ours ? 'text-brand-yellow' : 'text-brand-gray'}`}>{num}</p>
                      <p className="text-brand-gray text-xs uppercase tracking-widest leading-snug">{label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-brand-gray mt-4 opacity-60">Partner Net Promoter Scores from the NEXT Summit 2026 post-event surveys; industry benchmark as reported by the survey platform.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── AUDIENCE ── */}
        <section id="audience" className="py-24 bg-brand-dark relative border-b border-brand-white/10">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center mb-14" data-anim style={anim}>
              <h2 className="text-4xl md:text-5xl font-bold text-brand-white mb-4 uppercase">Who's In <span className="text-brand-yellow">The Room</span></h2>
              <p className="text-brand-gray text-lg max-w-2xl mx-auto">A summit built on category fit, not badge count - the buyers, builders and rule-makers of prediction markets.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {audience.map(([label, Icon], i) => (
                <div key={label} data-anim style={{ ...anim, transitionDelay: `${i * 50}ms` }}
                  className="flex flex-col items-center gap-3 bg-brand-white/5 border border-brand-white/10 rounded-2xl px-4 py-8 hover:border-brand-yellow/50 hover:bg-brand-white/8 transition-all duration-300">
                  <Icon className="w-7 h-7 text-brand-yellow" aria-hidden />
                  <p className="text-sm font-bold text-brand-white text-center uppercase tracking-wide">{label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12" data-anim style={anim}>
              {[
                ['The Content', 'Three stages across two days: the Leadership Stage headline programme, plus two hub stages for deeper category conversations - regulation, liquidity, sports, data and the builder economy.'],
                ['The Network', 'Three NEXTworking evenings, curated introductions, private meeting rooms and hosted hospitality - built for a market that trades on relationships.'],
                ['The Reach', "Livestream, filmed sessions, official photography and the aftermovie extend your visibility well beyond the room, across NEXT's channels and your own."],
              ].map(([title, body]) => (
                <div key={title} className="bg-brand-white/5 p-6 rounded-xl border border-brand-white/10 hover:border-brand-yellow transition-colors duration-300">
                  <h4 className="text-brand-yellow font-bold mb-3 uppercase">{title}</h4>
                  <p className="text-sm text-brand-gray leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING / RATE CARD ── */}
        <section id="pricing" className="py-24 bg-brand-dark relative">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center mb-10" data-anim style={anim}>
              <h2 className="text-4xl md:text-5xl font-bold text-brand-yellow mb-4 uppercase">Partnership Rate Card</h2>
              <p className="text-brand-gray max-w-3xl mx-auto">
                Published pricing, all-in where stated. Exclusive and shared routes over the same inventory are
                alternatives - the calculator enforces it. Prices in EUR and exclude VAT.
              </p>
              <button onClick={downloadRateCardPDF}
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full border border-brand-yellow/50 text-brand-yellow font-bold text-sm uppercase tracking-widest hover:bg-brand-yellow/10 transition-colors">
                <Download className="w-4 h-4" aria-hidden /> Download Full Rate Card
              </button>
            </div>

            {/* Filters */}
            <div className="mb-14 space-y-3" data-anim style={anim}>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-brand-gray font-bold mr-1">Objective:</span>
                {impacts.map((f) => (
                  <button key={f} onClick={() => setActiveImpact(activeImpact === f ? null : f)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${activeImpact === f ? 'bg-brand-yellow text-brand-dark border-brand-yellow' : 'border-brand-white/20 text-brand-gray hover:border-brand-yellow/60 hover:text-brand-white'}`}>
                    {f}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-brand-gray font-bold mr-1">Format:</span>
                {types.map((f) => (
                  <button key={f} onClick={() => setActiveType(activeType === f ? null : f)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${activeType === f ? 'bg-brand-yellow text-brand-dark border-brand-yellow' : 'border-brand-white/20 text-brand-gray hover:border-brand-yellow/60 hover:text-brand-white'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Product grid by category */}
            {filteredByCategory.map(({ cat, items }) => (
              <div key={cat} className="mb-16">
                <div className="flex items-center gap-4 mb-8" data-anim style={anim}>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-brand-white uppercase">{cat.replace(/-/g, '\u2011')}</h3>
                  <div className="h-px bg-brand-yellow/30 flex-1" />
                  <span className="text-xs text-brand-gray">{items.length} product{items.length === 1 ? '' : 's'}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((item) =>
                    item.featured
                      ? <FeaturedPricingCard key={item.id} item={item} onAdd={addToCart} rebooking={rebooking} cartCount={cartCounts[item.id] || 0} conflicted={conflictedIds.has(item.id)} />
                      : <PricingCard key={item.id} item={item} onAdd={addToCart} rebooking={rebooking} cartCount={cartCounts[item.id] || 0} conflicted={conflictedIds.has(item.id)} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── RECOGNITION LEVELS ── */}
        <section id="recognition" className="py-24 bg-brand-white/[0.03] relative border-y border-brand-white/10">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center mb-14" data-anim style={anim}>
              <h2 className="text-4xl md:text-5xl font-bold text-brand-white mb-4 uppercase">Partner <span className="text-brand-yellow">Recognition</span></h2>
              <p className="text-brand-gray max-w-3xl mx-auto">
                Recognition is earned on your combined total spend across all NEXTPredict 2027 products.
                It carries no extra charge and adds no further products - it is how prominently the event says thank you.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4" data-anim style={anim}>
              {[
                ['Silver', 'Below €30k', 'text-brand-gray', 'Silver position and logo recognition across agreed listings, website and onsite displays.'],
                ['Gold', '€30k – €79,999', 'text-yellow-400', 'Gold position and logo recognition across agreed listings, website and onsite displays.'],
                ['Platinum', '€80k – €134,999', 'text-blue-300', 'Platinum position and logo recognition across agreed listings, website and onsite displays.'],
                ['Diamond', '€135k+', 'text-cyan-100', 'Diamond position and logo recognition across agreed listings, website and onsite displays.'],
                ['Headline', 'Headline product', 'text-brand-yellow', 'The highest position in the partner hierarchy - reserved for the Headline Partner. Not reachable by spend alone.'],
              ].map(([name, band, color, desc], i) => (
                <div key={name} data-anim style={{ ...anim, transitionDelay: `${i * 60}ms` }}
                  className={`rounded-2xl border p-6 flex flex-col ${name === 'Headline' ? 'border-brand-yellow/60 bg-brand-yellow/8' : 'border-brand-white/10 bg-brand-white/5'}`}>
                  <p className={`text-xl font-black uppercase mb-1 ${color}`}>{name}</p>
                  <p className="text-xs text-brand-gray mb-4">{band}</p>
                  <p className="text-xs text-brand-gray leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-brand-gray text-xs mt-8 opacity-70" data-anim style={anim}>
              Levels are based on total NEXTPredict 2027 spend only. NEXT.io media spend and other NEXT.io events do not count towards recognition here.
            </p>
          </div>
        </section>

        {/* ── TICKETS ── */}
        <TicketsSection anim={anim} />

        {/* ── REBOOKING / CTA ── */}
        <section className="py-24 bg-brand-dark relative">
          <div className="max-w-5xl mx-auto px-8 text-center" data-anim style={anim}>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-yellow/10 border border-brand-yellow/20 rounded-full text-brand-yellow text-xs font-bold tracking-widest uppercase mb-8">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden /><span>2026 Partners</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-brand-white uppercase mb-6">Rebook Early. <span className="text-brand-yellow">Keep 15%.</span></h2>
            <p className="text-lg text-brand-gray max-w-3xl mx-auto mb-10">
              Partners from NEXTPredict 2026 qualify for a 15% rebooking rate on 2027 packages, with first
              conversation on the exclusive inventory they held. The rebooking rate is not combinable with any
              other offer. Toggle it in the calculator to see your pricing.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="mailto:sales@next.io?subject=NEXTPredict 2027 rebooking"
                className="bg-brand-yellow text-brand-dark px-8 py-4 rounded-full font-black text-sm uppercase tracking-widest hover:bg-white transition-colors inline-flex items-center gap-2">
                <Mail className="w-4 h-4" aria-hidden /> Talk To Partnerships
              </a>
              <button onClick={downloadRateCardPDF}
                className="border border-brand-white/20 text-brand-white px-8 py-4 rounded-full font-black text-sm uppercase tracking-widest hover:border-brand-yellow hover:text-brand-yellow transition-colors inline-flex items-center gap-2">
                <Download className="w-4 h-4" aria-hidden /> Full Rate Card PDF
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-brand-white/10 py-14 bg-brand-white/[0.03]">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between gap-8">
          <div>
            <p className="font-black text-2xl uppercase tracking-tight mb-2">NEXT<span className="text-brand-yellow">Predict</span> 2027</p>
            <p className="text-brand-gray text-sm">The Prediction Markets Summit · October 2027 · New York City</p>
            <p className="text-brand-gray/60 text-xs mt-1">Exact dates and venue to be announced.</p>
          </div>
          <div className="text-sm text-brand-gray space-y-2 md:text-right">
            <p><a href="mailto:sales@next.io" className="hover:text-brand-yellow transition-colors font-semibold">sales@next.io</a></p>
            <p><a href="https://next.io" target="_blank" rel="noreferrer" className="hover:text-brand-yellow transition-colors">next.io</a></p>
            <p className="text-xs text-brand-gray/60 max-w-md md:ml-auto">
              All prices exclude VAT. Availability subject to change without notice. Exclusive and shared routes
              over the same inventory are alternatives, never sold together. Ticket prices in USD; partnership
              prices in EUR.
            </p>
          </div>
        </div>
      </footer>

      <CalculatorPanel cart={cart} onRemove={removeFromCart} rebooking={rebooking} setRebooking={setRebooking} open={calcOpen} setOpen={setCalcOpen} />
    </div>
  )
}
