// netlify/functions/alerts-subscribe.js
// POST /api/alerts/subscribe  {email, kinds[], municipalities[], priceMin, priceMax, website, source}
// Saves the choices and sends a confirmation email (double opt-in).

import { rpc, json, sendMail, canSendMail, layout, button, esc, money, SITE, LOCATIONS, KINDS } from '../lib/alerts-lib.js';

const describe = (kinds, munis, min, max) => {
  const what = kinds.length === 2 ? 'properties and condos' : kinds[0] === 'condo' ? 'condos' : 'properties';
  const where = munis.length ? munis.join(', ') : 'all locations';
  const price = !min && !max ? 'any price' : min && max ? `${money(min)} to ${money(max)}` : min ? `from ${money(min)}` : `up to ${money(max)}`;
  return `New ${what} in ${where}, ${price}.`;
};

export default async function handler(request) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  let data;
  try { data = await request.json(); } catch (e) { return json({ error: 'Invalid request' }, 400); }

  // bots fill the hidden field
  if (data.website) return json({ status: 'pending' });

  const email = String(data.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) return json({ error: 'Please enter a valid email address.' }, 400);

  const kinds = (Array.isArray(data.kinds) ? data.kinds : []).filter((k) => KINDS.includes(k));
  const munis = (Array.isArray(data.municipalities) ? data.municipalities : []).filter((m) => LOCATIONS.includes(m));
  const num = (v) => (v === null || v === undefined || v === '' || !isFinite(Number(v)) ? null : Number(v));
  let min = num(data.priceMin), max = num(data.priceMax);
  if (min !== null && max !== null && min > max) [min, max] = [max, min];
  const finalKinds = kinds.length ? kinds : KINDS.slice();

  let row;
  try {
    row = await rpc('listing_alert_subscribe', {
      p_email: email, p_kinds: finalKinds, p_municipalities: munis.length ? munis : null,
      p_price_min: min, p_price_max: max, p_source: String(data.source || '').slice(0, 60)
    });
  } catch (e) {
    console.error(e.message);
    return json({ error: 'Something went wrong. Please try again later.' }, 500);
  }

  if (row.confirmed) return json({ status: 'updated' });

  if (!canSendMail()) {
    console.error('RESEND_API_KEY is not set: confirmation email not sent for a new subscriber');
    return json({ status: 'pending' });
  }

  const confirmUrl = `${SITE}/api/alerts/confirm?token=${row.confirm_token}`;
  const summary = describe(finalKinds, munis, min, max);
  try {
    await sendMail({
      to: email,
      subject: 'Please confirm your listing alerts',
      html: layout({
        preheader: 'One click and you will hear about new listings first.',
        title: 'Confirm your listing alerts',
        intro: `Thank you for your interest in Palawan. Please confirm your email address, and we will let you know as soon as a new listing matches what you are looking for.<br><br><strong style="color:#2a2a2a;">Your alert:</strong> ${esc(summary)}`,
        body: button(confirmUrl, 'Confirm my alerts') +
          `<tr><td style="padding:0 32px 22px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#8d7764;">If you did not sign up, simply ignore this email. You will not receive anything else.</td></tr>`,
        footerNote: 'You received this email because this address was entered on pathwayphilippines.com.'
      }),
      text: `Please confirm your listing alerts from Pathway Real Estate.\n\nYour alert: ${summary}\n\nConfirm here: ${confirmUrl}\n\nIf you did not sign up, simply ignore this email.`
    });
  } catch (e) {
    console.error(e.message);
    return json({ error: 'We could not send the confirmation email. Please try again later.' }, 502);
  }
  return json({ status: 'pending' });
}

export const config = { path: '/api/alerts/subscribe' };
