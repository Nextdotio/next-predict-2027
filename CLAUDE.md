# NEXTPredict 2027 — sponsorship brochure

Single-page React (Vite + Tailwind) app. Main content lives in `src/App.jsx`
(product/pricing data, ticket ladder, recognition tiers, calculator).

## Workflow

- Develop on branch `claude/2027-ticket-pricing-brochure-p79mqg`.
- Run `npm run build` to verify changes compile.
- Commit with a clear message and push the branch.
- `npm run deploy` (= `vite build && npx gh-pages -d dist`) publishes to
  gh-pages once Pages is enabled for this repo.
- Open a fresh PR into `main` only when asked.

## Notes

- Pricing/product data is the `pricing` array in `src/App.jsx`; each item has
  `bullets` (a `\n`-separated string) with `📅` slot/availability lines and
  `⚠️` condition notes (either/or routes, opt-in wording).
- The pricing array is the 2027 rate card from the NEXTPredict 2027
  commercial master (canonical prices, reconciled 27 Aug 2026). Partnership
  prices are EUR; ticket prices are USD.
- Internal-only content (revenue targets, discount caps, pipeline, 2026
  actuals, COS, open decisions) is deliberately excluded from the brochure.
- Exclusive/shared routes over the same inventory (NEXTworking evenings,
  Stage 2/3 per-day vs both-days, Nourish bars) are enforced as conflicts in
  the `CONFLICTS` map — never sold together, never double-counted.
- To mark a product sold or reserved, add one line to the `PRODUCT_STATUS`
  map in `src/App.jsx` (search "SALES DESK"), e.g.
  `'Leadership Stage Partner': 'sold',` — card badge, calculator button and
  rate-card PDF all react automatically.
- Recognition tiers: Silver <€30k, Gold €30–79,999, Platinum €80–134,999,
  Diamond ≥€135k by total spend; Headline is gated on the Headline Partner
  product, not spend.
- Design follows the NEXT.io house system shared with the New York and Valletta
  brochures: brand yellow #ffcf33 on brand dark #242426, Inter throughout, and
  the official NEXTPredict logo in `public/logos/`. Keep any new work on those
  tokens — no separate palette or display face for this event.
- Venue/date lines say "October 2027 · New York City · exact dates and venue
  to be announced" — update them the moment Event Ops confirms.
- DECIDED (Stuart, 1 Sep 2026, supersedes the 31 Aug plan-EB note): the
  ticket ladder is the Commercial Master ladder, as locked in the
  consolidation workbook's Ticket Ladders sheet — EB/Std/Late: VIP
  $2,199/$2,999/$3,399 · Full $1,299/$1,799/$2,099 · Conference
  $949/$1,249/$1,449 · Day Pass $779/$1,079/$1,259 (60% of Full) ·
  Operator & Regulator $650/$900/$1,050 (50% of Full). Early Bird goes
  live 16 Nov 2026. The ladder also carries a gated Start-up rate
  ($549/$749/$849, staged) that is deliberately NOT shown on the card.
- DECIDED (Stuart, 3 Sep 2026, two rounds — Pierre's mandate: NEXTPredict
  prices at roughly double NYC 2026, which NEXTPredict 2026 already carried;
  NYC 2027 rose ~50% on 2026, so the mandate ≈ ×1.33 of the live 2027 NY
  card and the card's ×1.54 median exceeds it — do NOT double against 2027
  prices): comparison-driven repricing vs the New
  York card; every matched product now prices above its New York equivalent.
  Digital Event Guide €35k, Lanyard €45k per unit, Wi-Fi €28k, Stage 2 Per
  Day €65k / Both-Days €115k (11.5% two-route discount) / Presenter €55k,
  Stage 3 Both-Days €60k (fixes the zero premium vs 2× NY per-day and the
  27% two-route discount), Leadership Chair €45k, Day 1 NEXTworking shared
  €38k (5 slots; keeps the €150k exclusive at a 21% discount, within the
  ≤25% rule for 4+ slots), Exhibition 6x8 €135k / 8x4 €110k / 6x4 €75k /
  6x2 €60k (new product, two adjacent cluster positions, 6 max from the
  12-position pool) / 3x2 €33k (~+16–23% over NY turnkey; the 6x8 alone
  reaches the Diamond tier threshold). The Start-Up Zone (€9.5k/€16k) deliberately stays
  accessible and is not benchmarked against New York. The commercial master
  still carries the earlier set — update at the next master revision.
- DECIDED (Stuart, 16 Sep 2026) reconciling Olivia's 2027 master product
  list: Badge Sponsor back to €32,000 (the master's figure, reversing the
  4 Sep move to €30,800); Media Lounge renamed Media Zone; Leadership
  Branded Session to 6 slots and Stage 2 Branded Session to 4, per the
  master's per-day allocations. Stage 3 Day 2 is the workshop track, so
  the Stage 3 both-days exclusive is withdrawn and the per-day partner
  and presenter become Day 1 exclusives. The Start-Up Zone is retired -
  the expo floor absorbs it, New York never carried one and only
  NEXTPredict 2026 ran it. Exhibition booths now split turnkey vs
  space-only, space-only at 88% of the turnkey rate (6x8 €135k/€119k,
  8x4 €110k/€97k, 6x4 €75k/€66k), each pair an either/or route - the
  master priced both routes identically, which gave the build away free.
- A small set of held items and unvalidated concepts is intentionally NOT in
  the brochure; the list lives in the commercial master, not in this repo.

## Navigation and card anatomy (23 Sep 2026)

Stuart: "it's hard to find products when i have to scroll right down for them",
and "beautify the brochures". The page is now products first.

- **Section order:** hero → `ProductMenu` (#menu) → rate card (#pricing) →
  recognition → about → the room (#audience) → tickets → rebooking. About and
  The Room used to sit above the rate card and put the first product seven
  phone screens down. The nav "Rate Card" link shows at every width.
- **`ProductMenu`** lists every card with its entry price (`menuPrice`: "from"
  the lowest open route, POA, or Sold / Reserved from `PRODUCT_STATUS`), every
  family heading links to its group, and tickets link to their ladder rows
  (`t-<slug>`). On phones each family is a row that opens its list.
- **`FamilyBar`** is `position: sticky` inside #pricing, so it leaves with the
  section; IntersectionObserver scroll-spy lights the family in view and a
  phone keeps that chip scrolled into view.
- **Anchors:** every card is `p-<slug of its title>` (`productId`), every family
  the slug of its name (`catId`). A route card also carries `p-<slug>` of each
  route's full product title, which opens the card on that route, so older
  links keep working. `.jump-target` / `.jump-section` / `.jump-near`
  (index.css) offset landings by `--nav-h` and `--bar-h`, which App measures
  with a ResizeObserver - never hardcode them. First-load deep links are landed
  after render. Jumps go through `onJump`, which clears a filter that hides the
  target. Anchor ancestors use `.clip-box` (overflow: clip), not
  `overflow-hidden`: a hidden ancestor is a scroll container and cut the scroll
  margin (the first ticket row landed under the nav).
- **Route cards (`ROUTE_CARDS`):** an exclusive/shared or turnkey/space-only pair
  over the same inventory is one card with option tiles. The card title is the
  part of the two product names they share; each tile is the rest of its name,
  verbatim. Each route keeps its own price, deliverables, terms, status and
  calculator line. Every pair must also be in `CONFLICTS`. The Nourish Bars
  pair stays as two cards: their names share no stem.
- **Terms:** `splitBullets` moves 📅 / ⚠️ lines into the always-visible
  "Availability & terms" block (`TermsList`), word for word, with small icons -
  never pills, never red. Deliverables collapse after four lines on a narrow
  card (never to hide a single line) and show in full on a wide one. Both
  PDFs mirror this; they also write NEXTPredict with no `text-transform`.
- **Lede:** `quote` renders plain through `Lede` (no quote marks, no italics).
- **No orphans:** `familySpans` / `spanClass` balance each family's grid (two up
  from md, three up from xl); a card left alone on a row spans it and lays
  itself out wide by container query (`@2xl` on the card).
- **Type:** Inter via `--font-sans` in `src/index.css`. The Tailwind v3 name
  `--font-family-sans` was ignored, so the page rendered the system font.
