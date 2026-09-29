// Lower Manhattan at night, for the hero: the Financial District seen from
// the East River, drawn on a 2880 x 480 board with the river line at y = 440.
// One World Trade Center stands at the middle of the board, so any centred
// crop keeps it in frame: 3 and 4 World Trade either side, then 70 Pine's
// stepped crown, 40 Wall Street's pyramid and spire, 8 Spruce, the Woolworth
// Building's crown, and a tower of the Brooklyn Bridge with its cables. The
// office windows are lit on their floor grids, from a seeded generator, so the
// city is the same on every render. House charcoal and yellow only.
// Heights follow the real towers at 0.77 board units a metre.
export const FIDI_VIEWBOX = '0 0 2880 480'
export function wallStreetSVG(id = 'ws') {
  let seed = 23
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const INK = '#151516', INK2 = '#1b1b1d', LIT = '#ffcf33'
  const G = 440
  const out = []
  out.push(`<defs><linearGradient id="${id}-river" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1b17"/><stop offset="1" stop-color="#242426"/></linearGradient></defs>`)
  const towers = [] // [x, top, w, fill, kind]
  // the far blocks, low and paler, all along the island
  for (let x = 0; x < 2880;) {
    const w = 26 + Math.round(rnd() * 40)
    const centre = Math.max(0, 1 - Math.abs(x - 1440) / 1100)
    const h = 24 + Math.round(rnd() * 56 + centre * 70)
    towers.push([x, G - h, w, INK2, 'far'])
    x += w + Math.round(rnd() * 6)
  }
  // mid-rise office towers around the landmarks
  for (let x = 380; x < 2480;) {
    const w = 30 + Math.round(rnd() * 34)
    const centre = Math.max(0, 1 - Math.abs(x - 1440) / 900)
    const h = 52 + Math.round(rnd() * 58 + centre * 72)
    towers.push([x, G - h, w, INK, 'mid'])
    x += w + 8 + Math.round(rnd() * 22)
  }
  const shapes = towers.map(([x, y, w, f]) => `<rect x="${x}" y="${y}" width="${w}" height="${G - y + 1}" fill="${f}"/>`)
  const L = [] // landmarks, drawn over the blocks
  // 3 World Trade Center (329 m): diagonal bracing, the roof masts
  L.push(`<rect x="1318" y="187" width="62" height="${G - 187}"/><rect x="1330" y="170" width="3" height="18"/><rect x="1364" y="166" width="3" height="22"/>`)
  // One World Trade Center (417 m roof, 541 m spire): tapering to the roof, the spire above
  L.push(`<path d="M1398 ${G} L1398 392 L1404 392 L1416 118 L1464 118 L1476 392 L1482 392 L1482 ${G} Z"/><rect x="1419" y="110" width="42" height="9"/><rect x="1438.5" y="24" width="3" height="88"/><rect x="1432" y="84" width="16" height="3"/>`)
  L.push(`<path d="M1440 118 L1440 392" stroke="#232325" stroke-width="2"/>`)
  // 4 World Trade Center (297 m): a slim slab, sloping cut at the top
  L.push(`<path d="M1500 ${G} L1500 214 L1546 206 L1546 ${G} Z"/>`)
  // 70 Pine Street (290 m to the lantern): Art Deco setbacks
  L.push(`<path d="M1590 ${G} L1590 300 L1600 300 L1600 266 L1610 266 L1610 244 L1618 244 L1618 226 L1624 214 L1630 226 L1630 244 L1638 244 L1638 266 L1648 266 L1648 300 L1658 300 L1658 ${G} Z"/><rect x="1622.5" y="198" width="3" height="18"/>`)
  // 40 Wall Street (283 m): the pyramid roof and its spire
  L.push(`<path d="M1690 ${G} L1690 290 L1696 290 L1696 262 L1716 238 L1736 262 L1736 290 L1742 290 L1742 ${G} Z"/><rect x="1714.5" y="222" width="3" height="18"/>`)
  // 8 Spruce Street (265 m): the rippled tower, a stepped top
  L.push(`<path d="M1792 ${G} L1792 244 L1804 240 L1812 236 L1826 234 L1836 238 L1836 ${G} Z"/>`)
  // Woolworth Building (241 m): the Gothic crown and pinnacles
  L.push(`<path d="M1872 ${G} L1872 330 L1884 330 L1884 290 L1892 290 L1892 272 L1900 258 L1904 246 L1908 258 L1916 272 L1916 290 L1924 290 L1924 330 L1936 330 L1936 ${G} Z"/><rect x="1902.5" y="234" width="3" height="14"/>`)
  // Battery Park City and 1 Liberty-style slabs on the left
  L.push(`<rect x="1180" y="270" width="54" height="${G - 270}"/><rect x="1246" y="236" width="50" height="${G - 236}"/><rect x="1100" y="300" width="60" height="${G - 300}"/>`)
  shapes.push(`<g fill="${INK}">${L.join('')}</g>`)
  out.push(shapes.join(''))
  // office windows lit on their floor grids
  const lit = []
  const grid = (x, y, w, dens) => {
    for (let fy = y + 8; fy < G - 10; fy += 9) for (let fx = x + 4; fx < x + w - 5; fx += 7) if (rnd() < dens) lit.push(`<rect x="${fx}" y="${fy}" width="2.4" height="3.2" opacity="${(0.3 + rnd() * 0.6).toFixed(2)}"/>`)
  }
  for (const [x, y, w, , kind] of towers) grid(x, y, w, kind === 'far' ? 0.05 : 0.12)
  for (const [x, y, w] of [[1318, 187, 62], [1406, 140, 68], [1500, 214, 46], [1590, 300, 68], [1690, 290, 52], [1792, 244, 44], [1872, 330, 64], [1180, 270, 54], [1246, 236, 50], [1100, 300, 60]]) grid(x, y, w, 0.2)
  out.push(`<g fill="${LIT}">${lit.join('')}</g>`)
  // the Brooklyn Bridge: a stone tower with its two arches, and the cables
  out.push(`<g fill="${INK}"><path d="M2140 ${G} L2140 360 L2146 350 L2194 350 L2200 360 L2200 ${G} Z"/><rect x="2136" y="346" width="68" height="6"/></g>`)
  out.push(`<g fill="#6b5418"><path d="M2150 ${G - 20} L2150 372 C2150 364 2164 364 2164 372 L2164 ${G - 20} Z M2176 ${G - 20} L2176 372 C2176 364 2190 364 2190 372 L2190 ${G - 20} Z"/></g>`)
  out.push(`<path d="M2140 352 C2300 410 2520 424 2880 426 M2200 352 C2340 404 2560 418 2880 420 M2140 352 C2080 380 2020 396 1980 402" fill="none" stroke="#48484c" stroke-width="1.6"/>`)
  const hangers = []
  for (let x = 2210; x < 2880; x += 22) { const t = (x - 2200) / 680, cy = 352 + (418 - 352) * (1 - Math.pow(1 - t, 2.2)); hangers.push(`M${x} ${cy.toFixed(1)} L${x} ${G - 22}`) }
  out.push(`<path d="${hangers.join(' ')}" stroke="#3a3a3e" stroke-width="0.8"/>`)
  out.push(`<rect x="1980" y="${G - 22}" width="900" height="5" fill="${INK}"/>`)
  const lights = []
  for (let x = 1990; x < 2880; x += 38) lights.push(`<circle cx="${x}" cy="${G - 24}" r="1.6"/>`)
  out.push(`<g fill="${LIT}" opacity="0.8">${lights.join('')}</g>`)
  // the river and the city's lights on it
  out.push(`<rect x="0" y="${G}" width="2880" height="40" fill="url(#${id}-river)"/><rect x="0" y="${G}" width="2880" height="1" fill="${LIT}" opacity="0.2"/>`)
  const refl = []
  for (let r = 0; r < 8; r++) for (let k = 0; k < 18; k++) {
    const cx = 1100 + rnd() * 900, len = 6 + rnd() * 22
    refl.push(`<rect x="${(cx - len / 2).toFixed(1)}" y="${(G + 4 + r * 4.4).toFixed(1)}" width="${len.toFixed(1)}" height="1.3" rx="0.6" opacity="${(0.55 - r * 0.06).toFixed(2)}"/>`)
  }
  out.push(`<g fill="${LIT}" class="ws-shimmer">${refl.join('')}</g>`)
  return out.join('')
}

// The probability line: a seeded random walk that climbs across the sky, on
// a 1000 x 400 board (the hero stretches it). Returns the line's points, the
// area under it, and where it ends (as fractions of the board). `start` seeds
// the walk: the hero uses 5, the cards' designed headers another seed.
export function probabilityLine(start = 5) {
  let seed = start
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const pts = []
  let y = 300
  for (let i = 0; i <= 94; i++) {
    const x = i * 10
    const drift = -2.2 + (i > 60 ? -1.2 : 0)
    y = Math.max(40, Math.min(360, y + drift + (rnd() - 0.5) * 26))
    pts.push([x, Math.round(y)])
  }
  const line = pts.map(([x, py]) => `${x},${py}`).join(' ')
  const area = `M0 400 L${pts.map(([x, py]) => `${x} ${py}`).join(' L')} L940 400 Z`
  const [ex, ey] = pts[pts.length - 1]
  return { line, area, end: [ex / 1000, ey / 400] }
}
