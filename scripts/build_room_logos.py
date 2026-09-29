#!/usr/bin/env python3
"""Build the NEXTPredict 2026 logo strips from pristine logo files.

Input:  logo-src/room/            untouched copies of official logo files
        logo-src/room/raster/     each SVG rendered once to a transparent PNG
                                  (scripts/raster_room_logos.mjs, Chromium)
Output: public/logos/room/*.png   white marks, trimmed to their content box
        src/roomLogos.js          the manifest the page and the deck read

Who is on the walls (29 Sep 2026, Stuart: "let's add the logos as well of
attending companies and also sponsors of this year's event"):
- PARTNERS: the six Official Event Partners on NEXT's own NEXTPredict 2026
  summit page (nextpredict.io/summits/the-worlds-prediction-markets-summit),
  from the files NEXT publishes there;
- REGISTERED and PRESS: organisations on the attendee list of NEXT's
  NEXTPredict 2026 Audience Snapshot, registered as at 28 September 2026 (the
  press are the accredited newsrooms it names). A company that appears only
  in the snapshot's speaker list is NOT shown (that is a question for
  Stuart), and no company is taken from anywhere else. Files come from the
  sibling repos first, then Wikimedia Commons or the company's own site.
  No sportsbook or casino brand on any NEXTPredict wall, even where the
  snapshot files it under trading (Stuart, 29 Sep 2026): EXCLUDED below
  names them with the reason, and the build stops if one is listed in a
  table, so a rebuild can never bring one back.
  Left off for want of an official file (29 Sep 2026), though registered:
  Galaxy Digital, Crypto.com, GSR, TP ICAP, Chicago Trading Company,
  tastytrade, MarketAxess, BGC Group, Oppenheimer, Talos, Underdog, Sportico,
  Front Office Sports, American Banker, Pensions & Investments and The
  Atlantic (the Commons file under that name is another company's). Add one
  by dropping its untouched official file into logo-src/room and a row here.

Every PNG is baked to a structure-preserving white mark with the hub's
method (next-2027/scripts/build_logos.py): luminance maps to opacity, so a
white detail stays a cut-out instead of flattening to a block. Modes:
  paper  every colour is ink and only white is paper (the default: coloured
         or dark marks on transparency, whose white details must stay cut out)
  shape  every opaque pixel is ink (light marks made for dark sites)
  plate  a mark printed on a solid plate: the plate drops out
  dark   a dark mark on a white canvas
  ink    like paper, but any clearly coloured pixel is full ink, for a
         multi-tone mark whose paler colours would otherwise read grey
The build only reads logo-src, so a rerun rewrites the same files.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'logo-src', 'room')
OUT = os.path.join(ROOT, 'public', 'logos', 'room')
MANIFEST = os.path.join(ROOT, 'src', 'roomLogos.js')
MAX_H, MAX_W = 120, 720

NEXT_PAGE = 'https://nextpredict.io/summits/the-worlds-prediction-markets-summit/'
UP = 'https://nextpredict.io/wp-content/uploads/2026/'
COMMONS = 'https://commons.wikimedia.org/wiki/File:'
HUB = 'next-2027/logo-src/operators/'

# (key, name, source file in logo-src/room, mode, where the file came from)
PARTNERS = [
    ('mrkts', 'mrkts', 'mrkts.png', 'shape', UP + '04/mrkts_logo_transparent_inverted.png'),
    ('morgan-stanley', 'Morgan Stanley', 'morgan-stanley.png', 'shape', UP + '04/MS_Standard_Logo_2022_White.png'),
    ('rolr', 'Rolr', 'rolr.png', 'paper', UP + '04/HR-Resized-.png'),
    ('edge-markets', 'EDGE Markets', 'edge-markets.png', 'shape', UP + '04/EDGE-Markets-Bicolor-Logotype-on-Light-Background.png'),
    ('radar', 'Radar', 'radar.png', 'paper', UP + '04/Radar_logo-RGB_black-3.png'),
    ('betconstruct-ai', 'BetConstruct AI', 'betconstruct-ai.jpg', 'plate', UP + '09/Untitled-design-8.jpg'),
]
PRESS = [
    ('wsj', 'The Wall Street Journal', 'wsj.svg', 'paper', COMMONS + 'The_Wall_Street_Journal_Logo.svg'),
    ('bloomberg', 'Bloomberg', 'bloomberg.svg', 'paper', COMMONS + 'Bloomberg_logo-2556aaa618.svg'),
    ('reuters', 'Reuters', 'reuters.svg', 'paper', COMMONS + 'Reuters_logo_2024.svg'),
    ('cnbc', 'CNBC', 'cnbc.svg', 'ink', COMMONS + 'CNBC_logo.svg'),
    ('nyt', 'The New York Times', 'nyt.png', 'paper', 'https://static01.nyt.com/images/misc/NYT_logo_rss_250x40.png'),
    ('fortune', 'Fortune', 'fortune.svg', 'paper', COMMONS + 'Fortune_magazine_logo_2016.svg'),
]
# Led by the room's largest blocs: trading and exchanges, then finance,
# technology and payments, and media.
REGISTERED = [
    ('cboe', 'Cboe Global Markets', 'cboe.svg', 'paper', COMMONS + 'Cboe_Global_Markets_Logo.svg'),
    ('cme-group', 'CME Group', 'cme-group.svg', 'paper', COMMONS + 'CME_Group_Logo.svg'),
    ('nasdaq', 'Nasdaq', 'nasdaq.svg', 'paper', COMMONS + 'NASDAQ_Logo.svg'),
    ('interactive-brokers', 'Interactive Brokers', 'interactive-brokers.svg', 'paper', COMMONS + 'Interactive_Brokers_Logo_(2014).svg'),
    ('goldman-sachs', 'Goldman Sachs', 'goldman-sachs.svg', 'paper', COMMONS + 'Goldman_Sachs_2022_Black.svg'),
    ('jump-trading', 'Jump Trading', 'jump-trading.svg', 'ink', COMMONS + 'Jump_Trading_logo.svg'),
    ('susquehanna', 'Susquehanna', 'susquehanna.png', 'paper', COMMONS + 'Susquehanna_International_Group_Logo.png'),
    ('citi', 'Citi', 'citi.svg', 'paper', COMMONS + 'Citi_logo_March_2023.svg'),
    ('kalshi', 'Kalshi', 'kalshi.svg', 'paper', COMMONS + 'Kalshi-logo-2026.svg'),
    ('drw', 'DRW', 'drw.png', 'paper', COMMONS + 'DRW_Holdings.png'),
    ('millennium', 'Millennium', 'millennium.png', 'paper', 'https://www.mlp.com/wp-content/uploads/2024/03/logo-mlp.png'),
    ('jefferies', 'Jefferies', 'jefferies.svg', 'paper', COMMONS + 'Jefferies_logo.svg'),
    ('sgx', 'SGX Group', 'sgx.png', 'paper', COMMONS + 'SGX_gradient_logo_(PNG).png'),
    ('macquarie', 'Macquarie', 'macquarie.svg', 'shape', 'https://www.macquarie.com/assets/macq/site-wide-assets/common-icons/macquarie-logo.svg'),
    ('aqr', 'AQR', 'aqr.png', 'paper', COMMONS + 'AQR_Capital_Management_Logo.png'),
    ('stripe', 'Stripe', 'stripe.svg', 'paper', COMMONS + 'Stripe_Logo,_revised_2016.svg'),
    ('plaid', 'Plaid', 'plaid.svg', 'paper', COMMONS + 'Plaid_logo.svg'),
    ('fiserv', 'Fiserv', 'fiserv.svg', 'paper', COMMONS + 'Fiserv_logo.svg'),
    ('transunion', 'TransUnion', 'transunion.svg', 'paper', COMMONS + 'TransUnion_logo.svg'),
    ('business-insider', 'Business Insider', 'business-insider.svg', 'paper', COMMONS + 'Business_Insider_2023_logo.svg'),
    ('coindesk', 'CoinDesk', 'coindesk.svg', 'paper', 'https://www.coindesk.com/ (the header wordmark; its CSS-variable fills set to black so it draws outside the page, nothing else changed)'),
    ('yahoo-sports', 'Yahoo Sports', 'yahoo-sports.png', 'paper', COMMONS + 'Yahoo_Sports_New_Logo.png'),
    ('law360', 'Law360', 'law360.png', 'paper', 'https://static.law360news.com/images/law360-logo-navy-2023.png'),
]


# Never on a NEXTPredict wall, whatever the snapshot files them under (Stuart,
# 29 Sep 2026: "no sportsbook brand on NEXTPredict"; the rule covers casino
# brands too). The build stops if any of these appears in a table above.
SPORTSBOOK_RULE = 'No sportsbook or casino brand on any NEXTPredict wall, even where the snapshot files it under trading (Stuart, 29 Sep 2026)'
EXCLUDED = {
    'fanduel': ('FanDuel', 'sportsbook; the snapshot also files it under Trading & Liquidity'),
    'draftkings': ('DraftKings', 'sportsbook; the snapshot also files it under Trading & Liquidity'),
    'fanatics': ('Fanatics', 'sportsbook'),
    'betmgm': ('BetMGM', 'sportsbook and casino'),
    'hard-rock-digital': ('Hard Rock Digital', 'sportsbook and casino'),
    'rush-street-interactive': ('Rush Street Interactive', 'casino and sportsbook'),
    'betfair': ('Betfair', 'betting exchange and sportsbook'),
    'better-collective': ('Better Collective', 'sports betting media'),
}


def norm(s):
    return ''.join(ch for ch in s.lower() if ch.isalnum())


def check_excluded(*tables):
    names = {norm(k) for k in EXCLUDED} | {norm(v[0]) for v in EXCLUDED.values()}
    for table in tables:
        for key, name, *_ in table:
            if norm(key) in names or norm(name) in names:
                sys.exit(f'{name} is excluded: {SPORTSBOOK_RULE}. Take it out of the table.')


def plate_ink(rgb, alpha):
    """Contrast against the plate: the design's most common opaque colour."""
    solid = alpha >= 0.9
    bins = (rgb[solid] * 255).astype(int) // 32
    _, which, counts = np.unique(bins, axis=0, return_inverse=True, return_counts=True)
    plate = np.median(rgb[solid][which.ravel() == counts.argmax()], axis=0)
    dist = np.sqrt(((rgb - plate) ** 2).sum(axis=-1) / 3.0)
    printed = dist[(alpha >= 0.5) & (dist > 0.1)]
    return np.clip(dist / np.median(printed), 0, 1) if printed.size else dist


def bake(im, mode):
    a = np.asarray(im.convert('RGBA')).astype(np.float64) / 255.0
    alpha = a[..., 3]
    rgb = a[..., :3]
    lum = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]
    if mode == 'dark':
        ink = 1.0 - lum
    elif mode == 'shape':
        ink = np.ones_like(lum)
    elif mode == 'paper':
        ink = 1.0 - rgb.min(axis=-1)
    elif mode == 'ink':
        ink = np.clip((1.0 - rgb.min(axis=-1)) * 3.0, 0, 1)
    elif mode == 'plate':
        ink = plate_ink(rgb, alpha)
    else:
        raise ValueError(mode)
    ink = ink * alpha
    peak = ink.max()
    if peak > 0:
        ink = ink / peak
    ink = np.clip((ink - 0.12) / 0.76, 0, 1) ** 0.9
    out = np.zeros_like(a)
    out[..., :3] = 1.0
    out[..., 3] = ink
    return Image.fromarray((out * 255).astype(np.uint8))


def trim(im):
    alpha = np.asarray(im)[..., 3]
    ys, xs = np.nonzero(alpha > 24)
    if not len(xs):
        return None
    pad = 2
    box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(im.width, xs.max() + 1 + pad), min(im.height, ys.max() + 1 + pad))
    return im.crop(box)


def build(entries, group, missing):
    out = []
    for key, name, src, mode, origin in entries:
        path = os.path.join(SRC, 'raster', src[:-4] + '.png') if src.endswith('.svg') else os.path.join(SRC, src)
        if not os.path.exists(path):
            missing.append(f'{group}: {name} ({src})')
            continue
        im = trim(bake(Image.open(path), mode))
        if im is None:
            missing.append(f'{group}: {name} (empty after baking)')
            continue
        scale = min(MAX_H / im.height, MAX_W / im.width, 1.0)
        if scale < 1:
            im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
        im.save(os.path.join(OUT, key + '.png'), optimize=True)
        out.append({'key': key, 'name': name, 'file': key + '.png', 'ratio': round(im.width / im.height, 3), 'source': origin})
    return out


def main():
    check_excluded(PARTNERS, PRESS, REGISTERED)
    os.makedirs(OUT, exist_ok=True)
    missing = []
    partners = build(PARTNERS, 'partners', missing)
    press = build(PRESS, 'press', missing)
    registered = build(REGISTERED, 'registered', missing)
    keep = {e['file'] for e in partners + press + registered}
    for f in os.listdir(OUT):
        if f not in keep:
            os.remove(os.path.join(OUT, f))
    fields = ('key', 'name', 'file', 'ratio')
    def rows(items):
        return ',\n'.join('  ' + json.dumps({k: e[k] for k in fields}) for e in items)
    js = ('// Built by scripts/build_room_logos.py from logo-src/room; never edit by hand.\n'
          '// Partners: NEXTPredict 2026 Official Event Partners (NEXT\'s summit page).\n'
          '// Press and registered: organisations on the NEXTPredict 2026 attendee list,\n'
          '// registered as at 28 September 2026. Sources: logo-src/room/SOURCES.json.\n'
          f'export const PARTNER_LOGOS = [\n{rows(partners)},\n]\n'
          f'export const PRESS_LOGOS = [\n{rows(press)},\n]\n'
          f'export const REGISTERED_LOGOS = [\n{rows(registered)},\n]\n')
    open(MANIFEST, 'w', encoding='utf-8').write(js)
    excluded = [{'key': k, 'name': n, 'reason': f'{why}. {SPORTSBOOK_RULE}'} for k, (n, why) in EXCLUDED.items()]
    json.dump({'partners': partners, 'press': press, 'registered': registered, 'excluded': excluded, 'partner_page': NEXT_PAGE},
              open(os.path.join(SRC, 'SOURCES.json'), 'w'), indent=1)
    print(f'partners {len(partners)}, press {len(press)}, registered {len(registered)}')
    if missing:
        print('missing (left out):', *missing, sep='\n  ')


if __name__ == '__main__':
    sys.dont_write_bytecode = True
    main()
