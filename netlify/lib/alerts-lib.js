// netlify/lib/alerts-lib.js
// Shared helpers for the listing alerts (kept outside the functions folder, bundled into each function).

export const SITE = (process.env.ALERTS_SITE_URL || 'https://pathwayphilippines.com').replace(/\/$/, '');
const FROM = process.env.ALERTS_FROM || 'Pathway Real Estate <listings@pathwayphilippines.com>';
const REPLY_TO = process.env.ALERTS_REPLY_TO || 'info@pathwayphilippines.com';

export const LOCATIONS = ['El Nido', 'Taytay', 'Port Barton', 'San Vicente', 'Coron', 'Puerto Princesa',
  'Napsan', 'Aborlan', 'Narra', "Brooke's Point", 'Balabac'];
export const KINDS = ['property', 'condo'];

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// Call one of the secured database functions
export async function rpc(name, args) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  const secret = process.env.ALERTS_SECRET;
  if (!url || !key || !secret) throw new Error('Missing environment variables for listing alerts');
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_secret: secret, ...args })
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${name} failed (${res.status}): ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

export const canSendMail = () => Boolean(process.env.RESEND_API_KEY);

export async function sendMail({ to, subject, html, text, unsubscribeUrl }) {
  const headers = {};
  if (unsubscribeUrl) {
    headers['List-Unsubscribe'] = `<${unsubscribeUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject, html, text, headers })
  });
  if (!res.ok) throw new Error(`Resend failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function money(n) {
  if (n === null || n === undefined || n === '') return '';
  const v = Number(n);
  if (!isFinite(v)) return '';
  if (v >= 1e6) return 'PHP ' + (Math.round(v / 1e4) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 }) + 'M';
  return 'PHP ' + Math.round(v).toLocaleString('en-US');
}

export function priceLabel(item) {
  const a = item.price_min, b = item.price_max;
  if (a && b && Math.round(a) !== Math.round(b)) return `${money(a)} to ${money(b)}`;
  return money(a || b) || 'Price on request';
}

// ---------- email layout ----------
const C = { bg: '#fffaf0', cream: '#e4ded3', camel: '#b6a180', brown: '#8d7764', taupe: '#7e6454', ink: '#2a2a2a' };

export function layout({ preheader, title, intro, body, footerNote }) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.cream};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader || '')}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:28px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.bg};">
<tr><td style="padding:30px 32px 6px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:15px;letter-spacing:4px;color:${C.taupe};">PATHWAY REAL ESTATE</td></tr>
<tr><td style="padding:2px 32px 22px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:3px;color:${C.camel};">PALAWAN, PHILIPPINES</td></tr>
<tr><td style="padding:0 32px;"><div style="border-top:1px solid ${C.cream};"></div></td></tr>
<tr><td style="padding:26px 32px 6px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;color:${C.ink};">${esc(title)}</td></tr>
<tr><td style="padding:6px 32px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:${C.brown};">${intro}</td></tr>
${body}
<tr><td style="padding:24px 32px 30px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:${C.camel};border-top:1px solid ${C.cream};">
Pathway Real Estate, Bountiful Village, San Pedro, Puerto Princesa, Palawan, Philippines<br>
Licensed real estate broker: Catherine Fabellorin, Broker No. 0033796<br>
${footerNote || ''}
</td></tr>
</table></td></tr></table></body></html>`;
}

export function button(href, label) {
  return `<tr><td style="padding:6px 32px 22px;"><a href="${esc(href)}" style="display:inline-block;background:${C.taupe};color:${C.bg};font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:14px 26px;">${esc(label)}</a></td></tr>`;
}

export function listingCard(item) {
  const url = SITE + item.link;
  const photo = item.photo ? `<a href="${esc(url)}"><img src="${esc(item.photo)}" width="536" alt="${esc(item.name)}" style="display:block;width:100%;max-width:536px;height:auto;border:0;"></a>` : '';
  const where = [item.barangay, item.municipality].filter(Boolean).join(', ');
  return `<tr><td style="padding:0 32px 22px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid ${C.cream};">
<tr><td>${photo}</td></tr>
<tr><td style="padding:18px 20px 4px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.camel};">${esc(item.kind === 'condo' ? 'Condo' : 'Property')}${where ? ' &middot; ' + esc(where) : ''}</td></tr>
<tr><td style="padding:2px 20px 4px;font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:1.3;color:${C.ink};"><a href="${esc(url)}" style="color:${C.ink};text-decoration:none;">${esc(item.name)}</a></td></tr>
<tr><td style="padding:2px 20px 4px;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:${C.taupe};">${esc(priceLabel(item))}</td></tr>
${item.detail ? `<tr><td style="padding:2px 20px 4px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${C.brown};">${esc(item.detail)}</td></tr>` : ''}
<tr><td style="padding:12px 20px 20px;"><a href="${esc(url)}" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.taupe};">View this listing</a></td></tr>
</table></td></tr>`;
}
