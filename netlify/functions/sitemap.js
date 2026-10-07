// netlify/functions/sitemap.js
// Liefert /sitemap.xml fuer Google: alle Hauptseiten auf Englisch und Deutsch (mit hreflang-Verweisen)
// plus jeden veroeffentlichten Artikel.
const PAGES = [
  ['/', '1.0'], ['/properties.html', '0.9'], ['/condos.html', '0.9'], ['/foreign-buyers.html', '0.8'],
  ['/calculator.html', '0.8'], ['/faq.html', '0.8'], ['/why-palawan.html', '0.7'], ['/services.html', '0.7'],
  ['/about.html', '0.6'], ['/news.html', '0.6'], ['/contact.html', '0.5'], ['/privacy.html', '0.2']
];
const BASE = 'https://pathwayphilippines.com';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

export default async function handler() {
  const alt = (en, de) =>
    `<xhtml:link rel="alternate" hreflang="en" href="${en}"/><xhtml:link rel="alternate" hreflang="de" href="${de}"/>` +
    `<xhtml:link rel="alternate" hreflang="x-default" href="${en}"/>`;
  const urls = [];
  for (const [p, prio] of PAGES) {
    const en = BASE + p, de = BASE + '/de' + p;
    urls.push(`<url><loc>${en}</loc>${alt(en, de)}<priority>${prio}</priority></url>`);
    urls.push(`<url><loc>${de}</loc>${alt(en, de)}<priority>${prio}</priority></url>`);
  }
  try {
    const endpoint = new URL(`${process.env.SUPABASE_URL}/rest/v1/public_news`);
    endpoint.searchParams.set('select', 'slug,published_at');
    endpoint.searchParams.set('kind', 'eq.article');
    endpoint.searchParams.set('order', 'published_at.desc');
    const res = await fetch(endpoint.toString(), {
      headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}` }
    });
    if (res.ok) {
      for (const a of await res.json()) {
        if (!a.slug) continue;
        const day = a.published_at ? new Date(a.published_at).toISOString().slice(0, 10) : '';
        urls.push(`<url><loc>${BASE}/news/${esc(a.slug)}</loc>${day ? `<lastmod>${day}</lastmod>` : ''}<priority>0.7</priority></url>`);
      }
    }
  } catch (e) {
    // the main pages are still listed
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
  });
}

export const config = { path: '/sitemap.xml' };
