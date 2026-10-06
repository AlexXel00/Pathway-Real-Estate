// netlify/functions/alerts-confirm.js
// GET /api/alerts/confirm?token=...  (link in the confirmation email)

import { rpc } from '../lib/alerts-lib.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  const back = (status) => Response.redirect(`${url.origin}/alerts.html?status=${status}`, 302);
  if (!UUID.test(token)) return back('invalid');
  try {
    const r = await rpc('listing_alert_confirm', { p_token: token });
    return back(r && r.ok ? 'confirmed' : 'invalid');
  } catch (e) {
    console.error(e.message);
    return back('error');
  }
}

export const config = { path: '/api/alerts/confirm' };
