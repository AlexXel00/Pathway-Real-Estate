// netlify/functions/news-article.js
// Baut fuer jeden eigenen Artikel eine echte HTML-Seite unter /news/<slug>.
// Das Layout (Navigation, Footer, Design) kommt aus Wesbite/news-article.html,
// hier werden nur Titel, Datum, Bild und Text eingesetzt.

const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Einfacher Text aus Supabase: Leerzeile = neuer Absatz, Zeile mit "## " = Zwischenueberschrift
const bodyToHtml = (text) =>
  String(text || '')
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) =>
      block.startsWith('## ')
        ? `<h2>${escapeHtml(block.slice(3))}</h2>`
        : `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`
    )
    .join('\n');

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

    const [postResponse, templateResponse] = await Promise.all([
      fetch(endpoint.toString(), {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
      }),
      fetch(`${origin}/news-article.html`)
    ]);

    if (!postResponse.ok || !templateResponse.ok) {
      return Response.redirect(`${origin}/news.html`, 302);
    }

    const rows = await postResponse.json();
    if (!rows.length) {
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
      '{{BODY}}': bodyToHtml(post.body)
    };

    let html = await templateResponse.text();
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
    return Response.redirect(`${origin}/news.html`, 302);
  }
}

export const config = { path: '/news/:slug' };
