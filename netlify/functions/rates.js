// netlify/functions/rates.js
// Exchange rates PHP -> USD / EUR for the whole website.
// The answer is kept in Netlify's CDN for 7 days, so the rates refresh automatically once a week
// (and after every deploy). If all rate providers fail, safe fallback values are returned.

const FALLBACK = { USD: 0.0174, EUR: 0.016 };

const sources = [
  {
    name: 'Frankfurter (European Central Bank reference rates)',
    url: 'https://api.frankfurter.dev/v1/latest?base=PHP&symbols=USD,EUR',
    read: (d) => ({ USD: d.rates && d.rates.USD, EUR: d.rates && d.rates.EUR, date: d.date })
  },
  {
    name: 'Frankfurter (European Central Bank reference rates)',
    url: 'https://api.frankfurter.app/latest?from=PHP&to=USD,EUR',
    read: (d) => ({ USD: d.rates && d.rates.USD, EUR: d.rates && d.rates.EUR, date: d.date })
  },
  {
    name: 'ExchangeRate-API',
    url: 'https://open.er-api.com/v6/latest/PHP',
    read: (d) => ({
      USD: d.rates && d.rates.USD,
      EUR: d.rates && d.rates.EUR,
      date: d.time_last_update_utc ? new Date(d.time_last_update_utc).toISOString().slice(0, 10) : null
    })
  }
];

const reply = (body, cdnSeconds) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      'Netlify-CDN-Cache-Control': `public, durable, s-maxage=${cdnSeconds}, stale-while-revalidate=86400`
    }
  });

export default async function handler() {
  for (const s of sources) {
    try {
      const res = await fetch(s.url, { headers: { Accept: 'application/json' } });
      if (!res.ok) continue;
      const r = s.read(await res.json());
      if (r.USD > 0 && r.EUR > 0) {
        return reply({ base: 'PHP', rates: { PHP: 1, USD: r.USD, EUR: r.EUR }, date: r.date, source: s.name }, 604800);
      }
    } catch (e) {
      // try the next provider
    }
  }
  // Short cache for the fallback, so a real update is tried again within the hour
  return reply({ base: 'PHP', rates: { PHP: 1, ...FALLBACK }, date: null, source: 'fallback' }, 3600);
}
