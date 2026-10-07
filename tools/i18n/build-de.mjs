// Builds the German pages in Wesbite/de/ from the English pages and the translation table.
//   node build-de.mjs <path to Wesbite> <path to de.json>
// The English pages stay the source. Anything without a translation is listed at the end,
// so nothing English slips through unnoticed when the English pages change.
import fs from 'fs';
import path from 'path';
import { load, walkUnits, walkAttrs, META_SELECTORS, norm, hasWords } from './units.mjs';

const [site, dictPath] = process.argv.slice(2);
const D = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
const BASE = 'https://pathwayphilippines.com';
const PAGES = D.pages;                       // pages that exist in German
const outDir = path.join(site, 'de');
fs.mkdirSync(outDir, { recursive: true });

const report = { missing: {}, jsUnmatched: {}, used: new Set() };
const enUrl = (f) => BASE + (f === 'index.html' ? '/' : '/' + f);
const deUrl = (f) => BASE + '/de/' + (f === 'index.html' ? '' : f);

function tr(page, en) {
  const key = norm(en);
  // numbers and symbols stay as they are, unless a German number format is given
  if (!hasWords(key)) return (D.numbers && D.numbers[key] !== undefined) ? D.numbers[key] : null;
  const own = D.pageText[page] && D.pageText[page][key];
  if (own !== undefined) { report.used.add(page + '::' + key); return own; }
  if (D.text[key] !== undefined) { report.used.add(key); return D.text[key]; }
  (report.missing[page] = report.missing[page] || []).push(key);
  return null;
}

// '/properties.html?x' -> '/de/properties.html?x' for pages that exist in German
function localHref(href) {
  if (!href) return href;
  if (href === '/' || href === '/index.html') return '/de/';
  const m = href.match(/^\/([\w-]+\.html)([?#].*)?$/);
  if (m && PAGES.includes(m[1])) return '/de/' + (m[1] === 'index.html' ? '' : m[1]) + (m[2] || '');
  return href;
}

// replace JS string literals whose content is in the table, plus exact code snippets
function translateScript(page, code) {
  const conf = D.js[page] || {};
  const lits = Object.assign({}, D.js['*'] && D.js['*'].literals, conf.literals || {});
  const hit = new Set();
  // 1) exact code replacements first (they may contain template literals); the shared ones are optional
  for (const [from, to] of (D.js['*'] && D.js['*'].replace) || []) {
    if (code.includes(from)) code = code.split(from).join(to);
  }
  const ESC = (t) => t.replace(/\u00b7/g, '\\u00b7');   // the code may write the middle dot as an escape
  for (const [from, to] of conf.replace || []) {
    if (code.includes(from)) { code = code.split(from).join(to); hit.add('R::' + from); }
    else if (code.includes(ESC(from))) { code = code.split(ESC(from)).join(ESC(to)); hit.add('R::' + from); }
  }
  // 2) literals, skipping comments
  let out = '', i = 0;
  while (i < code.length) {
    const c = code[i], n = code[i + 1];
    if (c === '/' && n === '/') { const e = code.indexOf('\n', i); const j = e < 0 ? code.length : e; out += code.slice(i, j); i = j; continue; }
    if (c === '/' && n === '*') { const e = code.indexOf('*/', i + 2); const j = e < 0 ? code.length : e + 2; out += code.slice(i, j); i = j; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1, ok = false;
      while (j < code.length) {
        if (code[j] === '\\') { j += 2; continue; }
        if (code[j] === '\n') break;
        if (code[j] === c) { ok = true; break; }
        j++;
      }
      if (!ok) { out += c; i++; continue; }
      const raw = code.slice(i + 1, j).replace(/\\u00b7/g, '\u00b7');
      if (Object.prototype.hasOwnProperty.call(lits, raw)) {
        // German text is inserted as written; an unescaped quote of the same kind gets a backslash
        const de = lits[raw].replace(new RegExp('(^|[^\\\\])' + c, 'g'), '$1\\' + c);
        out += c + de + c; hit.add('L::' + raw);
      } else out += code.slice(i, j + 1);
      i = j + 1; continue;
    }
    out += c; i++;
  }
  // 3) links to pages that exist in German
  out = out.replace(/(['"`(=])\/((?:index|[\w-]+)\.html)/g, (m, q, f) => (PAGES.includes(f) ? q + '/de/' + (f === 'index.html' ? '' : f) : m));
  return { code: out, hit };
}

for (const page of PAGES) {
  const html = fs.readFileSync(path.join(site, page), 'utf8');
  const $ = load(html);
  $('html').attr('lang', 'de');

  // head
  for (const [sel, attr] of META_SELECTORS) {
    const el = $(sel).first();
    if (!el.length) continue;
    const en = attr ? el.attr(attr) : el.html();
    if (!hasWords(en)) continue;
    const de = tr(page, en);
    if (de === null) continue;
    if (attr) el.attr(attr, de); else el.text(de);
  }
  $('link[rel="canonical"]').attr('href', deUrl(page));
  $('meta[property="og:url"]').attr('content', deUrl(page));
  $('meta[property="og:locale"]').remove();
  $('meta[property="og:type"]').after('\n<meta property="og:locale" content="de_DE">');
  $('link[rel="alternate"][hreflang]').remove();
  $('link[rel="canonical"]').after(
    `\n<link rel="alternate" hreflang="en" href="${enUrl(page)}">` +
    `\n<link rel="alternate" hreflang="de" href="${deUrl(page)}">` +
    `\n<link rel="alternate" hreflang="x-default" href="${enUrl(page)}">`);
  // German helpers (number formats, listing terms) load before the page scripts
  if (!$('script[src="/i18n-de.js"]').length) $('head').append('\n<script src="/i18n-de.js"></script>\n');

  // select options keep their English value (filters and form emails rely on it)
  $('option').each((_, o) => { if (o.attribs.value === undefined) $(o).attr('value', $(o).text()); });

  // body text
  walkUnits($, $('body')[0], (el, kind) => {
    const en = kind === 'html' ? $(el).html() : el.data;
    const de = tr(page, en);
    if (de === null) return;
    if (kind === 'html') $(el).html(de);
    else { const lead = el.data.match(/^\s*/)[0], tail = el.data.match(/\s*$/)[0]; el.data = lead + de + tail; }
  });
  walkAttrs($, (el, a, v) => { const de = tr(page, v); if (de !== null) $(el).attr(a, de); });

  // links and forms
  $('a[href]').each((_, a) => { if (!a.attribs['data-lang']) a.attribs.href = localHref(a.attribs.href); });
  $('form[action]').each((_, f) => { f.attribs.action = localHref(f.attribs.action); });
  $('form[data-netlify]').each((_, f) => {
    const lang = $(f).find('input[name="language"]');
    if (lang.length) lang.attr('value', 'German');
  });

  // language switch: point both links to the right pages, mark German active
  $('.lang-switch a').each((_, a) => {
    const l = a.attribs['data-lang'];
    a.attribs.href = l === 'de' ? '/de/' + (page === 'index.html' ? '' : page) : (page === 'index.html' ? '/' : '/' + page);
    $(a).toggleClass('active', l === 'de');
    if (l === 'de') $(a).attr('aria-current', 'true'); else $(a).removeAttr('aria-current');
  });

  // inline scripts
  const hits = new Set();
  $('script').each((_, s) => {
    if (s.attribs.src) return;
    const code = $(s).html();
    const r = translateScript(page, code);
    r.hit.forEach((h) => hits.add(h));
    $(s).text(r.code);
  });
  const conf = D.js[page] || {};
  const un = [];
  for (const [from] of conf.replace || []) if (!hits.has('R::' + from)) un.push('replace: ' + from.slice(0, 70));
  for (const k of Object.keys(conf.literals || {})) if (!hits.has('L::' + k)) un.push('literal: ' + k.slice(0, 70));
  if (un.length) report.jsUnmatched[page] = un;

  // script contents are written back raw by the parser, so the code stays exactly as translated
  // German menu words are longer: switch to the menu button a little earlier
  fs.writeFileSync(path.join(outDir, page), $.html().replace('@media (max-width: 1180px){', '@media (max-width: 1280px){'));
}

let problems = 0;
for (const [p, list] of Object.entries(report.missing)) {
  console.log(`\nMISSING in ${p} (${list.length}):`);
  list.forEach((k) => console.log('  - ' + k.slice(0, 160)));
  problems += list.length;
}
for (const [p, list] of Object.entries(report.jsUnmatched)) {
  console.log(`\nJS not matched in ${p}:`);
  list.forEach((k) => console.log('  - ' + k));
  problems += list.length;
}
const unusedGlobal = Object.keys(D.text).filter((k) => !report.used.has(k));
if (unusedGlobal.length) console.log(`\nUnused translations (${unusedGlobal.length}):\n` + unusedGlobal.map((k) => '  - ' + k.slice(0, 120)).join('\n'));
console.log(`\nBuilt ${PAGES.length} German pages, ${problems} open item(s).`);
