// netlify/functions/alerts-unsubscribe.js
// GET  /api/alerts/unsubscribe?token=...  (link in every alert email)
// POST /api/alerts/unsubscribe?token=...  (one-click unsubscribe from the email app)

import { rpc } from '../lib/alerts-lib.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  const oneClick = request.method === 'POST';
  const back = (status) => (oneClick ? new Response('OK', { status: 200 }) : Response.redirect(`${url.origin}${url.searchParams.get('lang') === 'de' ? '/de' : ''}/alerts.html?status=${status}`, 302));
  if (!UUID.test(token)) return back('invalid');
  try {
    await rpc('listing_alert_unsubscribe', { p_token: token });
    return back('unsubscribed');
  } catch (e) {
    console.error(e.message);
    return back('error');
  }
}

export const config = { path: '/api/alerts/unsubscribe' };
