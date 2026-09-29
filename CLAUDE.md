# NEXTPredict 2027 — sponsorship brochure

Single-page React (Vite + Tailwind) app. Main content lives in `src/App.jsx`
(product/pricing data, ticket ladder, recognition tiers, calculator).

## Workflow

- Develop on branch `claude/new-session-h6ajdg`: the live card is built from it
  (27 Sep 2026). It supersedes `claude/2027-ticket-pricing-brochure-p79mqg`,
  last touched 16 Sep 2026; never develop on or deploy from that branch. More
  than one session works on this branch, so pull before every deploy.
- Run `npm run build` to verify changes compile.
- Commit with a clear message and push the branch.
- `npm run deploy` (= `vite build && npx gh-pages -d dist`) publishes to
  `https://nextdotio.github.io/next-predict-2027/`. Confirm it prints
  `Published`.
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
  (Superseded 29 Sep 2026: see "The summit through line" at the end.)
- **`ProductMenu`** lists every card with its entry price (`menuPrice`: "from"
  the lowest open route, POA, or Sold / Reserved from `PRODUCT_STATUS`), every
  family heading links to its group, and tickets link to their ladder rows
  (`t-<slug>`). On phones each family is a row that opens its list. (Since 29
  Sep 2026 every family is a tile with a picture; see the end of this file.)
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
  never pills, never red. Every deliverable shows on every card, with no
  toggle, whatever the card's width (Stuart, 26 Sep 2026: "Please do include
  all deliverables. It's important"). (Superseded on the card only, 29 Sep
  2026: the summit spec folds both lists into "What's included · N" and
  "Availability & terms · N" accordions; every line stays in the page, on the
  slide and in both PDFs.) Both PDFs mirror this, every line; they
  also write NEXTPredict with no `text-transform`. The three Presenter cards
  carry "Full brand ownership of the content, within event guidelines" (the
  2026 spec's line, restored 26 Sep 2026): it is what separates a keynote from
  a branded session, so keep it.
- **Lede:** `quote` renders plain through `Lede` (no quote marks, no italics).
- **No orphans:** `familySpans` / `spanClass` balance each family's grid (two up
  from md, three up from xl); a card left alone on a row spans it and lays
  itself out wide by container query (`@2xl` on the card).
- **Type:** Inter via `--font-sans` in `src/index.css`. The Tailwind v3 name
  `--font-family-sans` was ignored, so the page rendered the system font.

## Present mode and seller tools (26 Sep 2026)

Stuart: "Make all brochures beautiful, easy to navigate, easy to understand for
buyers, and easy for our sellers to take the buyers through and convince them
to buy each and every product." A seller on a screen share presses Present and
walks the buyer through the card; the buyer gets a link to a product or to the
plan they built together.

- **Present mode** is `src/PresentMode.jsx`: the shared reference adapted to the
  house tokens, so it behaves the same as the other brochures. Local changes:
  `label` names the dialog (the uppercase top bar carries the logo image, never
  the brand name), `CopyLinkButton` takes `text` and a replaceable `look`, and
  the slide scroller clips x (a phone slide starts its slide-in 24px right).
- **Entry points:** nav Present (labelled from md, an icon button below),
  "Present the rate card" beside the menu's PDF button, a quiet Present on every
  card (opens on that product; a route card opens on the route on screen), and
  "Present these" on a goal chip.
- **The deck is built from the page's data every time it opens** (`buildDeck` in
  `App.jsx`, reading `CARDS`, `ticketLadder`, `RECOGNITION` and the cart), so a
  new product, family, route pair or status appears with no edit: cover, Why
  partner, Who's in the room, then per family in `CARDS` order a family slide
  and one slide per card, Delegate tickets, Ticket offers, Recognition, Your
  selection (only while the calculator has items), Next steps. Today: 66 slides
  (cover, 2 proof, 11 families, 48 cards, 2 ticket, recognition, next steps),
  67 with a selection. (29 Sep 2026: 67, 68 with a selection; the order is
  in "The summit through line" below.) A goal deck is the cover, the families with a match, the
  matching cards and next steps (a route card counts when either route matches,
  as the page filter does).
- **Slide ids are the page's anchors:** cards `p-<slug>`, families the family
  slug, and `cover`, `about`, `audience`, `tickets`, `ticket-offers`,
  `recognition`, `plan`, `next-steps`. `?present=` also takes a route's own
  anchor (the two-route slide, that route marked) and a ticket row's `t-<slug>`
  (the ladder, that row lit).
- **URL:** `?present` opens the cover, `?present=<id>` that slide; the address
  bar follows the slide (replaceState); closing removes `present`. A goal deck
  lives in state only: a reload opens the full deck on the same slide.
- **Keys:** right arrow, Space, PageDown next; left arrow, PageUp back; Home,
  End; G the slide list; Esc closes (the slide list first). Swipe on touch.
  Focus returns to whatever opened the deck.
- **Product slide:** family and the card's badge as a pill, name, `PriceBlock`
  (POA, rebooking rate), `Lede`, `TagRow`, `AddButton` through the page's
  `addToCart` (caps, conflicts, sold, reserved), Open the card, Copy link;
  every deliverable (`SlideDeliverables` never trims; past seven lines it sets
  smaller); `TermsList` word for word.
  The Nourish Bars pair, two cards in `CONFLICTS`, links to its alternative.
- **Two-route slide (`RouteSlide`):** each route keeps a panel with its price,
  add button, copy-link icon, lede, the lines only it carries and its own terms;
  what both routes carry word for word (lines, terms, and the lede when it is
  identical) is listed once, every line of it. Little shared: full-width
  panels. At 1280x800 the heaviest pairs scroll a little; label, price and add
  button always sit above the fold.
- **Copy link:** every card (a route card copies the route on screen), every
  product slide, each route panel, the ticket slide. It never carries `present`.
- **Goal chips** (`GoalChips`, top of the product menu) use the `impact` tags,
  the Objective filter's list; that filter is unchanged. One chip at a time, a
  toggle: matching lines highlight, the rest dim, the count shows ("11 products
  for Deal Flow") with Present these.
- **Plan link:** "Copy plan link" in the calculator, on the plan slide and on
  next steps: `?plan=<id>,<id>,...`, product ids repeated per unit (two Lanyard
  units = `53,53`). On load each id goes through `addToCart` in link order, so
  caps, conflicts and sold or reserved states apply and unknown or refused ids
  drop out; then `plan` is removed (replaceState) and the calculator opens. The
  2026 rebooking toggle is not carried: whether it applies is the buyer's to
  confirm.
- **One copy of every figure:** `EVENT_STATS`, `WHY_PARTNER`, `NPS_PROOF`,
  `NPS_SOURCE`, `ROOM_LEDE`, `ROOM_PILLARS`, `RECOGNITION`, `RECOGNITION_LEDE`,
  `RECOGNITION_NOTE`, `TICKET_OFFERS`, `TICKET_FOOTNOTE`, `REBOOKING_COPY`,
  `VENUE_LINE` and the components `TicketStages`, `TicketLadder`,
  `TicketOffers`, `RecognitionLevels`, `NpsTiles` feed both the page and the
  deck. Edit them there; never retype a figure onto a slide.

Rules future edits must keep:

- Slides, chips and labels read the page's data: nothing new is claimed (no new
  figures, proof, availability or sell-through) and nothing internal appears.
- Buyer-facing words only: the page never says seller, sales desk, talk track,
  pitch, objection or close. The button is "Present". No em dashes in new copy.
- The brand is always NEXTPredict: inside an uppercase element use `<Brand />`
  (it resets the case). Prediction markets are never framed as gambling or
  iGaming in new copy, and the page names iGaming nowhere (Stuart, 26 Sep
  2026: the about section's "This is not another iGaming expo with a new
  banner" became "This is not a trade show with a new banner").
- Slides render no element ids: the page stays mounted under the deck, so a
  shared block used on a slide takes a switch like `TicketLadder anchors`.
- The gated Start-up ticket rate is never added; the Start-Up Pass box
  describes it without a price.
  It allows up to two tickets per qualifying company (Stuart's email "Re: 2027
  rate cards for review + Bizzabo pages live this week", 3 Sep 2026, quoting
  his 1 Sep structure; applied 29 Sep 2026 with his go-ahead). It said one
  per company until then, from the 27 Aug framework.
- Stage 2's family icon is `Projector`, so `Presentation` stays the Present
  action.
- The nav fits one line at every width: Tickets joins at lg, Contact Sales is the
  round mail button below 500px, the year hides below 380px. Re-measure from
  320px up when a nav item changes (the nav is fixed, so an overflow check of
  the page does not see it clip).
- Keyboard focus shows a yellow ring (`:focus-visible` in `index.css`).
- DECIDED (Stuart, 27 Sep 2026): Leadership Stage Non-Branded Panel €22,000
  (was €19,000). The October main stage now sits above the non-branded panel
  on NEXTPredict Focus, the 15 April prediction markets day on the New York card
  (€20,000, down from €35,000 the same day). A one-day focus track never
  charges more than the flagship's main stage. Stage 2 (€16,000) and Stage 3
  (€10,000) non-branded panels are unchanged.

## Proof on every card (27 Sep 2026)

Stuart: "I need the layout and proof points to be visible on all brochures.
This needs to be hugely convincing to the buyer and hugely helpful for our
sales people."

- **The proof is the team's**, because NEXTPredict has no survey of its own
  on file: `NPS_PROOF` (partner NPS at Valletta and New York 2026, each
  against its own report's industry benchmark: +69 vs +23 from the Valletta
  July 2026 Explori report, +62 vs +21 from the New York April 2026 one)
  under `NPS_SOURCE`. Until 29 Sep 2026 a third tile said "+27 Industry
  Benchmark", which neither report carries; Explori benchmarks are rolling
  36-month averages, so each score keeps its own. The ticker shows the
  scores without the benchmark (the label's "+23" ran into the score). The first screen carries it with
  `WHY_PARTNER.npsIntro` (`HeroProof`, before the rate card banner; since 29
  Sep 2026 it is one line of the proof band, `ProofBand`), the
  deck's proof slide carries it, and both PDFs open with the same tiles and
  source. It reads the one copy of each figure: never retype one. Cards and
  product slides no longer repeat it (Stuart, 28 Sep 2026: "it's
  repetitive"); each carries its own value row instead (see "Value rows, value
  first", 29 Sep 2026).
- **No layout yet.** The venue is to be announced, so there is no floorplan
  or zone to show. When Event Ops confirm the venue, add one the way New York
  (floorplan spots) or Valletta (venue zones) do.

## Delivery corrections from Ops (27 Sep 2026)

Found by the 27 Sep audit against Olivia's master. Stuart told Olivia on
16 Sep that these were applied; they had reached the New York card, not
this one.

- **No freestanding banners and no projection wall** (Olivia, 14 Sep): off
  the four private meeting rooms, the dining and meeting area and the
  speakers' lounge; the projector wall is off the Nourish exclusive (bullet
  and lede). The lounge's new location in her sheet is not on the card: the
  2027 venue is to be announced, so no room name goes on until it is.
- **Availability lines follow the 16 Sep quantities**: the Leadership Stage
  Branded Session (6) and Stage 2 Branded Session (4) now say "Six slots" /
  "Four slots across the two days" (their old lines described 4 and 2), and
  the Stage 2 Partner (Per Day) has its own line back ("One Day 1 and one
  Day 2 partnership available" and its either/or term); the 16 Sep
  reconcile had pasted the Stage 3 line onto it.


## The hero: a market night in Lower Manhattan (27 Sep 2026)

Stuart: "Make the hero designs more beautiful as well ... NeXTPredict should
have a New York/wall street/prediction market vibe". Still Inter, charcoal and
yellow only (the design rule above): the feel comes from a trading screen and
the Financial District, not from a new palette or face.

- **The ticker** (`MarketTicker`, under the nav at `--nav-h`) runs `TICKER`:
  the date line, `EVENT_STATS` and `NPS_PROOF`, nothing else. It is
  `aria-hidden` because every one of those facts is on the page already.
  Never put a figure on it that the page does not carry, never an invented
  market, price or probability.
- **The probability line** (`MarketBackdrop`, `probabilityLine()` in
  `src/skyline.js`) is a seeded random walk that climbs across the sky behind
  the wordmark over a faint chart grid, draws in once and lands on a dot. It
  has no axis and no numbers: it is decoration, not data.
- **Lower Manhattan** (`FidiBand`, `wallStreetSVG()` in `src/skyline.js`) is
  drawn, not photographed, and says New York without naming a venue (the
  venue is still to be announced): One World Trade at the middle of a
  2880-wide board, 3 and 4 WTC, 70 Pine, 40 Wall Street, 8 Spruce, the
  Woolworth Building and a tower of the Brooklyn Bridge, office windows lit on
  their floor grids, the river below. It runs edge to edge under the chips;
  the proof block after it carries `.on-river` and sits on the lower half of
  the towers. `--fidi-h` (index.css, on `:root` because the sibling reads it)
  is 200px on a phone and 240px from sm, growing with the screen from 1440
  (100vw / 6). Those sizes keep the proof tiles above the fixed plan bar on
  1024x800, 1280x800 and 1366x768 screens, where they sat before the
  redesign: re-measure there before making the band taller.
- The ticker, the line and the river shimmer hold still under reduced motion.

## Decisions after the product-list audit (Stuart, 27 Sep 2026)

- **The hubs carry the presentation, not a panel** ("the hubs should probably
  have the presentation rather than the panel", the New York decision, which
  Olivia's per-day structure mirrors here). Both Stage 2 partner routes and
  the Stage 3 Partner (Day 1) now include the day's 20-minute presentation by
  the partner's C-level speaker, in place of "1 Custom Panel session
  included"; the Custom Sessions are the only custom panels. One
  presentation per stage per day, so in `CONFLICTS` the Stage 2 Presenter is
  either/or with both Stage 2 partner routes (19 with 17 and 18) and the
  Stage 3 Presenter with the Stage 3 Partner (24/25); each presenter's terms
  say so. The hub prices did not move (€65,000 per day, €115,000 both days,
  €33,000 Stage 3), though each now includes a presentation that sells
  alone at €55,000 or €30,000: a pricing question for Stuart, and whether the
  stand-alone presenters stay at all is open with Olivia and Rory.
- **Speaking content is shaped with the team.** Presenters, hub presentations
  and custom sessions carry "You shape the title, topic and format, in
  collaboration with the NEXT.io production and conference content team".
  The presenters keep "Full brand ownership of the content, within event
  guidelines" (the 26 Sep rule) above it. Since 28 Sep the content team
  approves every presentation for quality (see the 28 Sep section).
- **Passes: the card is right**, not Olivia's list (lanyards stay at 2 Full
  Event passes a unit); Stuart updates the list.

## Value rows, value first (29 Sep 2026)

Stuart, on the Headline's row ("1 · Headline Partner, sold once", "30 sec ·
Your video in conference breaks", "13 · Passes: 10 Full Event, 2 VIP, 1
Speaker"): "Let's be honest, these aren't exactly the best selling points for
a headliner. They'll be more thinking about getting their brand in front of as
many people as possible, the ROI of that huge spend, etc. For all these
numbers across all products, that needs to be the thinking. They need to be as
strong as possible, focused and centred around ROI, brand visibility, business
leads, association with the biggest brands, and networking and curated intros
if it's in the package." This replaces the 28 Sep "At a glance" rows, which
counted minutes, days, passes, stand sizes and screens. A first pass the same
day gave 35 cards a lone room figure and whole families the same row (every
stand 28%, every evening 61%), the repetition Stuart removed on 28 Sep ("it's
repetitive"); the second pass leads each row with the product's own coverage.

- **What a row is.** `ReachRow` answers one question, what do I get back for
  this money, in at most three figures, each through one of five lenses:
  reach, ROI, leads, brands, networking and introductions. Aim for two on
  every card; one only where nothing else is honest. Availability,
  durations, passes, stand sizes and counts of items (screens, baskets,
  risers, credenzas) stay in "What's included", where every line still is.
  The row sits on every card (the route on screen), every product slide, the
  two-route slide (once across both panels when the routes share it, in each
  panel when they differ) and both PDFs (`printGlance`; the rate card prints
  a shared route row once, under the tiles).
- **Coverage is reach.** While no audience count exists, the product's own
  coverage, read from its own lines, is the visibility figure: All, Every,
  Half, Only, Both, Full, #1. It says how much of the room, the night, the
  stage or the day carries the brand: "Every · Seat in the main hall carries
  your brand" (the chair partner), "All · Venue restrooms carry your brand",
  "Only · Brand on the Day 1 evening" (an exclusive evening), "Every · Hub
  seat carries your brand, both days" (a hub partner's delegate chairs),
  "Every · Visitor you scan joins your leads" (the stands' badge scanner),
  "Landmark · Position in the gallery" (a stand's position, in its own line's
  words). Each row leads with its coverage where the lines state one; the
  Speakers' Lounge and the Media Zone say only what their lines say about who
  uses them (the VIP speakers; the interviews the NEXT.io media team films).
  A coverage every partner gets is not a reason to buy one product, so it is
  never a figure (trimmed 29 Sep 2026, "less is more"): the three non-branded
  panels show the room alone (their only coverage was the shared logo loop),
  and a days count is never dressed as coverage ("Both · Days of ... branding"
  became "Every · Leadership Stage session, your brand" and "Every · Meal and
  meeting in your branded area", from the lines "across both event days").
- **Then the matched room figure**, one per product, with `ROOM_LABEL` as the
  source line: 61% director level and above, 37% founders and C-suite, 262
  organisations, 28% trading and liquidity (every stand), or the press
  (`NEWSROOMS`: "6 · Newsrooms: Bloomberg, Reuters and more", two of
  `ROOM_PRESS` named, as the proof band names them; the press lounge only).
  The three evenings take three different ones (Day 1 61%, Day 2 37%, the
  pre-registration evening 262). The livestream takes none: its viewers are
  not the room.
- **No family shows the same row on every card, and the first figure
  differs product to product** (a script check on 29 Sep 2026: every family
  passes). The evenings' labels name their night; the meeting rooms lead
  with their seats; the stands with their position.
- **The other figures, and only these:** 140k+ views of the summit pages
  (GA4, the NEXTPredict property, 141,445 views of nextpredict.io's summit
  pages from 1 Jan to 29 Sep 2026), on the Headline only, whose top billing
  on the site is a lead deliverable (a partners-section logo never carries
  it, and GA4 has no separate agenda page, so a session title does not
  either); the product's own counts, read from its bullets (`countIn`): #1
  billing above every other partner, 5 curated invitations (the workshop), 6
  curated introductions and €2,500 per introduction (€15,000 / 6), the seats
  at your private table; and `MEETING`, an assumption: 30-minute meetings, 8
  hours a day, on both event days, so up to 32 per room and "From €1,938 ·
  Per meeting, fully booked" on the 12-person room.
- **Order.** Coverage or the product's reason to buy first (introductions,
  seats, the room for speaking, who sees the brand), then its introductions
  or leads, then the room figure, then second channels; a cost per figure
  always goes last. It divides the product's own price by a figure in the
  same row, rounded to the euro, with "From" when the divisor is a maximum.
- **Headings.** Coverage, the room, GA4 and the product's own counts are
  facts: they keep "At a glance" and print their source line when they have
  one. Only an assumption (`MEETING`) or an estimate from the attendance
  turns a row to "Estimated reach" (`REACH_ESTIMATES`, beside
  `REACH_FACTS`). "Up to" marks a maximum, "From" a cost whose divisor is
  one.
- **Never:** New York's or Valletta's audience; NEXT.io's LinkedIn or any
  other NEXT.io audience; NEXTPredict's own LinkedIn following (about 1,200,
  it would weaken a row); a headcount from the snapshot; any iGaming,
  gambling or casino word.
- **Labels** are written from the buyer's side, present tense, at most 40
  characters, with no em dashes. The Wi-Fi row reads "All · Badges carry
  your network and password", New York's and Valletta's wording. Values
  never wrap or leave their column: measured 320 to 1440 on the page and on
  every slide. A row with one figure sets it on one line, the number beside
  its label.
- **Layout.** `ReachRow` is laid out by its own width, never the screen's
  (`@container` on the figure): from 22rem two or three figures stand side
  by side, each number over its label, and from 26rem the numbers go up a
  size; below 22rem each figure is a row, the number beside its label. The
  same row sits in a phone card, a two-up card at 768 and a slide, so a
  screen breakpoint cannot decide it.
- **`ATTENDEES_2026`** is null, and nothing renders from it while it is. When
  the 2026 actuals (22 to 23 Oct 2026) are in, set it to the real count: the
  Headline becomes [attendees] [#1 billing] [€ per attendee]; registration,
  the badge, the guide, the Wi-Fi, the restrooms and the stairs (behind
  registration) show everyone who attends, a lanyard unit half of them, the
  cloakroom and every stand "Up to" everyone ("From" their cost), each with
  € per attendee, under "Estimated reach" with the attendance line. A
  coverage that already counts the attendees ("All · Attendees wear your
  logo") becomes the number; any other keeps its place first, so the first
  figures still differ. Tried with 1,000 in a scratch build on 29 Sep 2026;
  shipped null. Never borrow New York's or Valletta's audience meanwhile.
- **Numbers that would add figures** (none on file yet): the 2026
  attendance (above); guests at each NEXTworking evening and at the C-Level
  Event (guests, € per guest); seats per stage once the 2027 venue and plan
  are confirmed (seats in the room, € per seat, for every speaking product
  and the chair partner); NEXTPredict 2026 livestream viewers (the
  Livestream Sponsor's second figure); a speakers' count (the speakers'
  lounge); badge scans per stand at NEXTPredict 2026 (the stands);
  accredited journalists at NEXTPredict 2026 (the press lounge). Opted-in
  contacts only once `LEAD_DATA.on` is true.
- **Counts on 29 Sep 2026:** all 48 cards carry a row (44 "At a glance", 4
  "Estimated reach"): 15 with three figures, 32 with two, 1 with one (the
  Livestream Sponsor). The deck at 1280x800: 25 of 67 slides scroll (25
  before the rows, 23 after the first pass), none sideways.

## Decisions after the product-list comparison (Stuart, 28 Sep 2026)

- **Speaking rules** (Stuart, 28 Sep: "sponsor works in collaboration with
  content team ... does not have full control"). Presentations (presenters,
  the hub presentations, a Headline's slot): the partner shapes them with the
  NEXT.io production and conference content team, who approve them for
  quality. Custom sessions: 2 speakers nominated by the partner, title, topic
  and description shaped together, and the content team adds 2 more speakers,
  with no partner veto. Branded sessions: the partner nominates 1 speaker; the
  content team controls all other speakers, topic, format and placement.
  Non-branded panels: the partner nominates 1 speaker; the content team
  controls topic, title, other speakers and format. Session lengths follow
  Olivia's list.
  On this card: the Headline's speaking opportunity is the list's 20-minute
  presentation with slide support, brand integration and video footage;
  custom sessions and non-branded panels are 20-30 minutes (the list). The
  stage partners' ledes no longer promise a custom panel.
- **After-movie logo for every sponsor** (Stuart, 28 Sep: "it's just a small
  logo at the end of the video and generally most sponsors if not all
  sponsors get that"). Cards say "Logo at the end of the ... after movie";
  the Headline and the exclusive evenings keep their bigger billing.
- **What Ops plans goes on the card** (Stuart, 28 Sep: "If the cards undersell
  much of what Ops plans, add them back in"). Firm (black or green) lines from
  Olivia's list were added to unsold products: filmed interviews, website
  logos, welcome posts, plaques, full brand ownership and slide support on the
  presentations, and the list's conditions as terms. Three things stay off:
  **30-second advertisement videos** ("they are an individual product as
  well ... we can't be risking our revenue targets if we're giving it for
  free"), extra passes (the card is right), and anything red on the list.
  On this card also: no room names while the venue is to be announced (the
  list's Hudson hubs, Pier Studio and Chelsea library stay off), and the
  Advertisement Video keeps the gallery wall until Olivia confirms the planner
  LED wall.
- **The Curated Introduction Package is on every summit card** (Stuart, 28
  Sep). €15,000, 3 available: New York and NEXTPredict sell the same product
  (brief and target-account matching, six opt-in introductions, an outcome
  summary); Valletta sells it as an add-on with up to 5 introductions. Keep
  them aligned when one changes.
- **Stand prices: the card is right.** The 6x8 (Booth 2, gallery) is €135,000
  and €119,000; the 8x4 (Booth 1, planner area) €110,000 and €97,000. Olivia's
  28 Sep email has the two swapped, most likely from the unlabelled 16 Sep
  list; her original sheet matched the card.

## The summit through line (29 Sep 2026)

Stuart, after New York and Valletta: "make sure there's a through line ...
less is more ... focus on value, ROI, the price obviously". The three summit
cards now share one shape (the brief: hero, proof band, "Where do I start?",
family tiles, one card anatomy, ROI calculator, lead-data slot); each keeps
its own scenery. This card keeps the market night: ticker, probability line,
Lower Manhattan.

- **Section order:** hero → proof band (`ProofBand`, #proof) → Where do I
  start (`WaysIn`, #start) → product menu (#menu) → rate card (#pricing) →
  who's in the room (`RoomSection`, #audience, with Why partner at #about) →
  tickets → recognition → ROI calculator (#roi-calculator) → a short close
  (rebooking and contact) → footer. Nav: Rate Card (to #start, every width),
  Calculator from md, Tickets from lg, The Room from xl, Present, Contact
  Sales.
- **The hero is one idea:** eyebrow "The Prediction Markets Summit · 2027
  edition" (the edition drops below sm), the wordmark, one date and venue
  line (`VENUE_LINE`), See the rate card and Present. No countdown: the dates
  are not announced. The chips, the skewed rate-card block and `HeroProof`
  are gone. On short desktop screens (`max-height: 820px` / `780px` in
  index.css) the hero tightens and the band shortens, so the proof figures
  stay above the fixed selection bar at 1024x800, 1280x800, 1366x768 and
  1440x900. Re-measure there before making the hero taller.
- **The proof band is the audience** (Stuart: "the biggest value for any
  product ... is the access to the audience"). It reads NEXT's NEXTPredict
  2026 Audience Snapshot (https://stuatnext.github.io/next-predict/), and
  every figure carries `ROOM_LABEL`, "Registered for NEXTPredict 2026, as at
  28 September 2026": 61% director level and above, 37% founders and
  C-suite, 262 organisations, 27 countries (`ROOM_FIGURES`), trading and
  liquidity the largest bloc at 28% (`ROOM_BLOC`), the seniority split
  (`ROOM_SENIORITY`, in the room section) and the accredited press
  (`ROOM_PRESS`). Then the logos, then the team's record (`NPS_PROOF`), then
  one source footnote (`ROOM_SOURCE`, `LOGOS_NOTE`, `NPS_SOURCE`). Rules: no
  job title next to a company or a person, no person's name, never the
  attendee list itself; companies only as logos or names. These are proof
  of who is in the room. A value row may carry one of them as a fact, never
  as an estimate or a headcount (see "Value rows, value first"). When the
  snapshot is refreshed, change the date in `ROOM_LABEL` and `ROOM_SOURCE`
  with the figures.
- **Logo walls** are built by `scripts/build_room_logos.py` (the hub's
  white-mark bake) from pristine files in `logo-src/room/` (SVGs are drawn
  once by `scripts/raster_room_logos.mjs`); `public/logos/room/` and
  `src/roomLogos.js` are build output. Every file's source is in
  `logo-src/room/SOURCES.json`. "2026 partners" are the six Official Event
  Partners on NEXT's NEXTPredict 2026 summit page, from the files NEXT
  publishes there. "Registered for 2026" and the press are organisations on
  the snapshot's attendee list (never a speaker-only company, never one found
  only by searching), led by exchanges, trading and finance. **No sportsbook
  or casino brand on any NEXTPredict wall, even where the snapshot files it
  under trading (Stuart, 29 Sep 2026).** `EXCLUDED` in the build script names
  each one with its reason (FanDuel, DraftKings, Fanatics, BetMGM, Hard Rock
  Digital, Rush Street Interactive, Betfair, Better Collective), `SOURCES.json`
  records them under `excluded`, and the build stops if one is listed in a
  table, so a rebuild can never bring one back. A company with no official
  file stays off too; the build script lists who is shown and why the rest
  are not (23 registered companies on the wall since 29 Sep 2026).
- **Where do I start?** (`WAYS`): Take the stage, Be seen by everyone, Meet
  the right people, Capture leads, each mapped to explicit product ids, each
  with its "from" price and count. Picking one sets the shared lens (the goal
  chips use the same one): the menu lights those products, opens their
  families and offers Present these. A new product joins a way only when its
  id is added there.
- **The menu** is family tiles (picture, name, product count, "from" price);
  a tile opens its list, and every line still links to its card.
- **Card anatomy:** picture, name, lede, the value row (`ReachRow`), option
  tiles, price and status, the lead-data slot, Add, quiet Present and Copy
  link, then "What's included · N" and "Availability & terms · N" as
  collapsed accordions (every line is in the page, on the slide and in both
  PDFs). A card alone on a row lays out picture-left.
- **Card pictures** (`CARD_VISUAL`, keyed by the card's first product id): 35
  photographs and 13 designed headers, none repeated. Photos are NEXT's own
  New York 2026 event photography, captioned "NEXT events, New York, 2026",
  or Convene's imagery of 30 Hudson Yards, captioned "Convene, 30 Hudson
  Yards, the 2026 venue" (never the 2027 venue, and no Convene room names:
  the room-name rule above). `scripts/card_photos.py` builds them (sources,
  crops and the softening are all in it). Left out: shots with sportsbook or
  iGaming signage, sponsor-branded chairs or booths, a speaker line-up or a
  readable name on screen. The 2026 stage and hub partners' logos on the
  stage walls are softened out, so no 2026 sponsor reads as a NEXTPredict
  partner. A product with no honest photograph gets a designed header marked
  "Illustration" (`ART`); the five stands are footprints drawn to one scale
  (`StandArt`). Replace them with NEXTPredict photography after the 2026
  summit.
- **Selling the quieter products** (Stuart: "branding on site is usually
  harder to sell than the speaking slots"): the branding, meeting-room,
  ad-video and Media Zone ledes say who sees it and how often, from each
  card's own lines only (every attendee at registration, on every badge,
  between sessions, recorded in the media zone). Family briefs
  (`FAMILY_BRIEFS`) are two sentences at most and point to the room.
- **ROI calculator** (`RoiCalculator`, #roi-calculator) is New York's: the
  plan total (or an investment slider when the plan is empty), expected
  qualified leads, close rate and deal size give deals, revenue, return and
  ROI, with the recognition level; Enquire, the proposal PDF and Copy plan
  link. The selection panel links to it.
- **Lead data** is one rule on TOTAL spend (Stuart, 29 Sep 2026), in one
  config (`LEAD_DATA`), switched OFF (`on: false`) until Pierre confirms the
  numbers in writing. `tiers`: from €30,000 of total spend (the plan total the
  recognition level reads), up to 50 opted-in contacts; from €60,000, up to
  100; from €100,000, up to 150. Stands keep their own booth scans and
  networking evenings share a selection of opted-in guests; below €30,000
  nothing (NEXTPredict sells no lead add-on); never the full attendee list.
  Switched on: the one rule line (`leadDataRule`) opens the rate card and the
  rate-card PDF; a plan that reaches a tier gets "Your plan includes up to N
  opted-in contacts" (`planLeadLine`, `PlanLeadLine`) in the selection panel,
  the ROI calculator, the plan slide and the proposal; the stand and evening
  cards (and their PDF lines) say their own line through `LeadDataBadge`, and
  no card shows a contact number. Tested switched on in a scratch build (29
  Sep 2026): €25,000 shows nothing, €35,000 up to 50, €70,000 up to 100,
  €120,000 up to 150. Turning it on publishes an entitlement: only with
  Pierre's written numbers.
- **The deck** follows the page: cover, Who's in the room, Why partner,
  Where to start (the four ways; each opens its own deck), then the families
  and cards, tickets, ticket offers, recognition, your selection, next
  steps: 67 slides, 68 with a selection. A way or a goal chip gives a lens
  deck (cover, its families, its cards, next steps). Measured with Inter
  loaded (scrollHeight over clientHeight): 25 of 67 slides scroll at
  1280x800 (26 of 66 before; 25 again with the value rows), none sideways;
  at 390 every long slide scrolls vertically and none sideways. Long product
  slides set their deliverables in two columns.
- **Motion:** a slow Ken Burns on card photos while on screen
  (`data-inview`), the logo marquee; both still under reduced motion, where
  the marquee wraps.
- **Checks to keep:** rendered innerText has no iGaming, gambling or casino,
  no NEXTPREDICT in capitals and no em dash; the nav fits one line from 320;
  no sideways scroll at 320 to 1440; deep links, `?plan=` and `?present=`
  land; both PDFs carry the room label and every deliverable.
