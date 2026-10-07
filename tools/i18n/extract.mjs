// node extract.mjs <site dir> <out dir>
// Writes one JSON per page with every English piece that needs a German version.
import fs from 'fs';
import path from 'path';
import { load, walkUnits, walkAttrs, META_SELECTORS, norm, hasWords } from './units.mjs';

const [site, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const pages = fs.readdirSync(site).filter((f) => f.endsWith('.html') && f !== 'news-article.html');
const seen = new Map();
for (const f of pages) {
  const $ = load(fs.readFileSync(path.join(site, f), 'utf8'));
  const items = [];
  const add = (key, kind) => {
    key = norm(key);
    if (!key || !hasWords(key)) return;
    if (!items.find((i) => i.en === key)) items.push({ en: key, kind });
    seen.set(key, (seen.get(key) || 0) + 1);
  };
  for (const [sel, attr] of META_SELECTORS) {
    const el = $(sel).first();
    if (el.length) add(attr ? el.attr(attr) : el.html(), 'meta');
  }
  walkUnits($, $('body')[0], (el, kind) => add(kind === 'html' ? $(el).html() : el.data, kind));
  walkAttrs($, (el, a, v) => add(v, 'attr:' + a));
  $('script[type="application/ld+json"]').each((_, el) => add('LDJSON::' + $(el).html().slice(0, 80), 'ldjson'));
  fs.writeFileSync(path.join(out, f.replace('.html', '.json')), JSON.stringify(items, null, 1));
  console.log(f, items.length);
}
const shared = [...seen].filter(([, n]) => n >= 5).map(([k]) => k);
fs.writeFileSync(path.join(out, '_shared.json'), JSON.stringify(shared, null, 1));
console.log('shared (on 5+ pages):', shared.length);
