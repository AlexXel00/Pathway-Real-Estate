// Shared logic: find the translatable pieces of an HTML page.
// A "unit" is an element whose direct content is text plus inline markup (a, em, strong, br ...).
// Its inner HTML is translated as a whole so German word order can differ from English.
import * as cheerio from 'cheerio';

export const INLINE = new Set(['a', 'abbr', 'b', 'br', 'cite', 'code', 'em', 'i', 'img', 'small', 'span', 'strong', 'sub', 'sup', 'u', 'time', 'mark', 's', 'q', 'wbr', 'svg', 'label']);
export const SKIP = new Set(['script', 'style', 'svg', 'noscript', 'template', 'iframe', 'head']);
export const ATTRS = ['alt', 'title', 'placeholder', 'aria-label', 'data-label'];

export const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
export const hasWords = (s) => /[A-Za-z]{2,}/.test(String(s).replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' '));

export function load(html) {
  return cheerio.load(html, { decodeEntities: false });
}

function isUnit($, el) {
  const kids = el.childNodes || [];
  let ownText = false;
  for (const k of kids) {
    if (k.type === 'text') { if (k.data.trim()) ownText = true; }
    else if (k.type === 'tag' || k.type === 'script' || k.type === 'style') {
      if (!INLINE.has(k.name)) return false;
    }
  }
  return ownText;
}

// visit(el, kind) is called for each unit element (kind 'html') and each stray text node (kind 'text')
export function walkUnits($, root, visit) {
  const rec = (el) => {
    if (el.type !== 'tag' && el.type !== 'root') return;
    if (el.type === 'tag' && SKIP.has(el.name)) return;
    if (el.type === 'tag' && isUnit($, el)) { visit(el, 'html'); return; }
    for (const k of el.childNodes || []) {
      if (k.type === 'text') { if (hasWords(k.data)) visit(k, 'text'); }
      else rec(k);
    }
  };
  rec(root);
}

export function walkAttrs($, visit) {
  $('body *').each((_, el) => {
    if (el.name === 'script' || el.name === 'style') return;
    for (const a of ATTRS) {
      const v = el.attribs && el.attribs[a];
      if (v && hasWords(v)) visit(el, a, v);
    }
    if (el.name === 'input' && /^(submit|button)$/i.test(el.attribs.type || '') && el.attribs.value && hasWords(el.attribs.value)) visit(el, 'value', el.attribs.value);
  });
}

export const META_SELECTORS = [
  ['title', null],
  ['meta[name="description"]', 'content'],
  ['meta[property="og:title"]', 'content'],
  ['meta[property="og:description"]', 'content'],
  ['meta[property="og:image:alt"]', 'content'],
  ['meta[name="twitter:title"]', 'content'],
  ['meta[name="twitter:description"]', 'content'],
];
