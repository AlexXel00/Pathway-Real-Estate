// netlify/functions/news.js
// Liefert die veroeffentlichten News-Beitraege fuer die Website.
// Datenquelle: View public_news (nur is_published = true und published_at in der Vergangenheit).
// Fuer Videos und Social-Posts wird hier gleich die passende Einbett-Adresse berechnet.

const embedFor = (url) => {
  if (!url) return { platform: '', embed: '' };
  let u;
  try { u = new URL(url); } catch (e) { return { platform: '', embed: '' }; }
  const host = u.hostname.replace(/^www\./, '').replace(/^m\./, '');
  const parts = u.pathname.split('/').filter(Boolean);

  if (host === 'youtu.be' && parts[0]) {
    return { platform: 'youtube', embed: `https://www.youtube-nocookie.com/embed/${parts[0]}` };
  }
  if (host.endsWith('youtube.com')) {
    const id = u.searchParams.get('v') || (['shorts', 'embed', 'live'].includes(parts[0]) ? parts[1] : '');
    if (id) return { platform: 'youtube', embed: `https://www.youtube-nocookie.com/embed/${id}` };
  }
  if (host.endsWith('vimeo.com')) {
    const id = parts.find((p) => /^\d+$/.test(p));
    if (id) return { platform: 'vimeo', embed: `https://player.vimeo.com/video/${id}` };
  }
  if (host.endsWith('instagram.com') && parts.length >= 2 && ['p', 'reel', 'tv'].includes(parts[0])) {
    return { platform: 'instagram', embed: `https://www.instagram.com/${parts[0]}/${parts[1]}/embed` };
  }
  if (host.endsWith('tiktok.com')) {
    const i = parts.indexOf('video');
    if (i >= 0 && parts[i + 1]) return { platform: 'tiktok', embed: `https://www.tiktok.com/embed/v2/${parts[i + 1]}` };
  }
  if (host.endsWith('facebook.com') || host === 'fb.watch') {
    const isVideo = url.includes('/videos/') || url.includes('/reel/') || host === 'fb.watch';
    const plugin = isVideo ? 'video.php' : 'post.php';
    return { platform: 'facebook', embed: `https://www.facebook.com/plugins/${plugin}?href=${encodeURIComponent(url)}&show_text=true&width=500` };
  }
  return { platform: '', embed: '' };
};

export default async function handler(request, context) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ error: 'Missing Supabase environment variables.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const endpoint = new URL(`${SUPABASE_URL}/rest/v1/public_news`);
    endpoint.searchParams.set('select', 'id,kind,title,slug,summary,cover_image_url,media_url,published_at');
    endpoint.searchParams.set('order', 'published_at.desc');

    const response = await fetch(endpoint.toString(), {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    });

    if (!response.ok) {
      const details = await response.text();
      return new Response(JSON.stringify({ error: 'Supabase request failed.', details }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const rows = await response.json();
    const posts = rows.map((row) => {
      const media = row.kind === 'article' ? { platform: 'website', embed: '' } : embedFor(row.media_url);
      return {
        id: row.id,
        kind: row.kind,
        title: row.title,
        slug: row.slug,
        summary: row.summary || '',
        cover: row.cover_image_url || '',
        url: row.kind === 'article' ? `/news/${row.slug}` : (row.media_url || ''),
        platform: media.platform,
        embed: media.embed,
        date: row.published_at
      };
    });

    return new Response(JSON.stringify({ posts }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Server error while loading news.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
