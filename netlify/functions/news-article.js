// netlify/functions/news-article.js
// Baut fuer jeden eigenen Artikel eine echte HTML-Seite unter /news/<slug>.
// Das Layout (Navigation, Footer, Design) kommt aus Wesbite/news-article.html,
// hier werden nur Titel, Datum, Bild, Text und die Google-Daten eingesetzt.
//
// Die Vorlage wird direkt aus den mitgelieferten Dateien gelesen (siehe
// included_files in netlify.toml). So funktioniert die Seite auch, solange die
// Website noch durch ein Passwort oder einen Team-Login geschuetzt ist.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// ---------- Vorlage laden ----------
const TEMPLATE = 'Wesbite/news-article.html';

const templateCandidates = () => {
  const list = [path.resolve(process.cwd(), TEMPLATE)];
  try {
    let dir = path.dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < 6; i++) {
      list.push(path.join(dir, TEMPLATE));
      dir = path.dirname(dir);
    }
  } catch (e) {
    // import.meta.url not available, the other paths are still tried
  }
  if (process.env.LAMBDA_TASK_ROOT) list.push(path.join(process.env.LAMBDA_TASK_ROOT, TEMPLATE));
  return [...new Set(list)];
};

const loadTemplate = async (origin) => {
  for (const file of templateCandidates()) {
    try {
      return await readFile(file, 'utf8');
    } catch (e) {
      // try the next location
    }
  }
  // Last resort: load it from the website itself (works once the site is public)
  const res = await fetch(`${origin}/news-article.html`);
  if (!res.ok) throw new Error(`Template not reachable (${res.status})`);
  return res.text();
};

// ---------- Artikeltext in HTML umwandeln ----------
// Unterstuetzt: ## und ### Ueberschriften, Absaetze, Listen (- und 1.),
// Tabellen (| a | b |), **fett**, *kursiv* und Links [Text](https://... oder /seite.html)
const inline = (text) => {
  let s = escapeHtml(text);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
    const raw = url.replace(/&amp;/g, '&');
    if (!/^(https?:\/\/|\/)/.test(raw)) return label;
    const external = /^https?:\/\//.test(raw) && !/pathwayphilippines\.com/.test(raw);
    return `<a href="${escapeHtml(raw)}"${external ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  return s;
};

const tableToHtml = (lines) => {
  const cells = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const head = cells(lines[0]);
  const rows = lines.slice(2).map(cells);
  return '<div class="table-wrap"><table><thead><tr>' + head.map((c) => `<th>${inline(c)}</th>`).join('') +
    '</tr></thead><tbody>' + rows.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') +
    '</tbody></table></div>';
};

const bodyToHtml = (text) =>
  String(text || '')
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n');
      if (block.startsWith('### ')) return `<h3>${inline(block.slice(4))}</h3>`;
      if (block.startsWith('## ')) return `<h2>${inline(block.slice(3))}</h2>`;
      if (lines.length >= 2 && lines.every((l) => l.trim().startsWith('|')) && /^\|?\s*:?-{2,}/.test(lines[1].trim())) return tableToHtml(lines);
      if (lines.every((l) => /^\s*[-*] /.test(l))) return '<ul>' + lines.map((l) => `<li>${inline(l.replace(/^\s*[-*] /, ''))}</li>`).join('') + '</ul>';
      if (lines.every((l) => /^\s*\d+\. /.test(l))) return '<ol>' + lines.map((l) => `<li>${inline(l.replace(/^\s*\d+\. /, ''))}</li>`).join('') + '</ol>';
      return `<p>${lines.map(inline).join('<br>')}</p>`;
    })
    .join('\n');

// ---------- Strukturierte Daten fuer Google ----------
// Fragen im Abschnitt "Frequently asked questions" im Format "**Frage?** Antwort"
const faqFromBody = (text) => {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const start = body.search(/^## (Frequently asked questions|FAQ)/im);
  if (start < 0) return [];
  const rest = body.slice(start).split('\n').slice(1).join('\n');
  const end = rest.search(/^## /m);
  const section = end < 0 ? rest : rest.slice(0, end);
  const plain = (s) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*+/g, '').trim();
  return section.split(/\n\s*\n/).map((b) => b.trim()).map((b) => {
    const m = b.match(/^\*\*(.+?\?)\*\*\s*([\s\S]+)$/);
    return m ? { q: plain(m[1]), a: plain(m[2]) } : null;
  }).filter(Boolean);
};

const jsonLd = (post, pageUrl, image, date) => {
  const graph = [{
    '@type': 'Article',
    headline: post.title,
    description: post.summary || post.title,
    image: [image],
    datePublished: date.toISOString(),
    dateModified: date.toISOString(),
    mainEntityOfPage: pageUrl,
    inLanguage: 'en',
    author: { '@type': 'Organization', name: 'Pathway Real Estate', url: 'https://pathwayphilippines.com/' },
    publisher: {
      '@type': 'Organization',
      name: 'Pathway Real Estate',
      url: 'https://pathwayphilippines.com/',
      logo: { '@type': 'ImageObject', url: 'https://pathwayphilippines.com/apple-touch-icon.png' }
    }
  }, {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://pathwayphilippines.com/' },
      { '@type': 'ListItem', position: 2, name: 'News', item: 'https://pathwayphilippines.com/news.html' },
      { '@type': 'ListItem', position: 3, name: post.title, item: pageUrl }
    ]
  }];
  const faq = faqFromBody(post.body);
  if (faq.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
    });
  }
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
};

// ---------- Seite ausliefern ----------
export default async function handler(request, context) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  const origin = new URL(request.url).origin;
  const slug = context.params && context.params.slug ? context.params.slug : '';

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !slug) {
    return Response.redirect(`${origin}/news.html`, 302);
  }

  try {
    const endpoint = new URL(`${SUPABASE_URL}/rest/v1/public_news`);
    endpoint.searchParams.set('select', 'title,slug,summary,body,cover_image_url,published_at,kind');
    endpoint.searchParams.set('slug', `eq.${slug}`);
    endpoint.searchParams.set('kind', 'eq.article');
    endpoint.searchParams.set('limit', '1');

    const [postResponse, template] = await Promise.all([
      fetch(endpoint.toString(), {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
      }),
      loadTemplate(origin)
    ]);

    if (!postResponse.ok) {
      console.error('news-article: Supabase request failed', postResponse.status);
      return Response.redirect(`${origin}/news.html`, 302);
    }

    const rows = await postResponse.json();
    if (!rows.length) {
      console.error('news-article: no published article for slug', slug);
      return Response.redirect(`${origin}/news.html`, 302);
    }

    const post = rows[0];
    const date = new Date(post.published_at);
    const dateLabel = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const pageUrl = `https://pathwayphilippines.com/news/${post.slug}`;
    const ogImage = post.cover_image_url || 'https://pathwayphilippines.com/images/og-pathway-palawan.jpg';
    const cover = post.cover_image_url
      ? `<figure class="article-cover"><img src="${escapeHtml(post.cover_image_url)}" alt="${escapeHtml(post.title)}"></figure>`
      : '';

    const values = {
      '{{TITLE}}': escapeHtml(post.title),
      '{{DESCRIPTION}}': escapeHtml(post.summary || post.title),
      '{{URL}}': escapeHtml(pageUrl),
      '{{OG_IMAGE}}': escapeHtml(ogImage),
      '{{DATE}}': escapeHtml(dateLabel),
      '{{DATE_ISO}}': escapeHtml(date.toISOString()),
      '{{COVER}}': cover,
      '{{BODY}}': bodyToHtml(post.body),
      '{{JSONLD}}': jsonLd(post, pageUrl, ogImage, date)
    };

    let html = template;
    for (const [key, value] of Object.entries(values)) {
      html = html.split(key).join(value);
    }
    // Die Vorlage selbst ist fuer Suchmaschinen gesperrt, der fertige Artikel nicht
    html = html.replace('<meta name="robots" content="noindex">', '');

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' }
    });
  } catch (error) {
    console.error('news-article: error', error && error.message);
    return Response.redirect(`${origin}/news.html`, 302);
  }
}

export const config = { path: '/news/:slug' };
