// netlify/functions/alerts-send.js
// Runs every hour. Finds listings that appeared on the website since the last run,
// emails every confirmed subscriber whose choices match (one email per person, listing
// all new matches), and records the listings as announced.

import { rpc, sendMail, canSendMail, layout, listingCard, SITE } from '../lib/alerts-lib.js';

export default async function handler() {
  if (!canSendMail()) {
    console.log('RESEND_API_KEY is not set: listing alerts paused, nothing marked as sent');
    return new Response('paused');
  }

  let items;
  try {
    items = await rpc('listing_alert_pending', {});
  } catch (e) {
    console.error(e.message);
    return new Response('error', { status: 500 });
  }
  if (!items || !items.length) return new Response('nothing new');

  // group the new listings by recipient
  const byEmail = new Map();
  for (const item of items) {
    for (const r of item.recipients || []) {
      if (!byEmail.has(r.email)) byEmail.set(r.email, { token: r.unsubscribe_token, items: [] });
      byEmail.get(r.email).items.push(item);
    }
  }

  const sentTo = [];
  for (const [email, { token, items: list }] of byEmail) {
    const unsubscribeUrl = `${SITE}/api/alerts/unsubscribe?token=${token}`;
    const one = list.length === 1;
    const subject = one ? `New listing: ${list[0].name}` : `${list.length} new listings in Palawan`;
    try {
      await sendMail({
        to: email,
        subject,
        unsubscribeUrl,
        html: layout({
          preheader: one ? `${list[0].name}, just listed on Pathway Real Estate.` : 'New listings that match your alert.',
          title: one ? 'A new listing for you' : 'New listings for you',
          intro: one
            ? 'A new listing that matches your alert has just gone online. Reply to this email or message us on WhatsApp if you would like more details or a viewing.'
            : 'New listings that match your alert have just gone online. Reply to this email or message us on WhatsApp if you would like more details or a viewing.',
          body: list.map(listingCard).join(''),
          footerNote: `You receive this email because you signed up for listing alerts on pathwayphilippines.com. <a href="${unsubscribeUrl}" style="color:#7e6454;">Unsubscribe</a>`
        }),
        text: list.map((i) => `${i.name} (${[i.barangay, i.municipality].filter(Boolean).join(', ')})\n${SITE}${i.link}`).join('\n\n') +
          `\n\nUnsubscribe: ${unsubscribeUrl}`
      });
      sentTo.push(email);
    } catch (e) {
      console.error(`alert to ${email} failed: ${e.message}`);
    }
  }

  try {
    await rpc('listing_alert_mark_sent', { p_keys: items.map((i) => i.item_key), p_emails: sentTo });
  } catch (e) {
    console.error(e.message);
  }
  return new Response(`announced ${items.length} listing(s), sent ${sentTo.length} email(s)`);
}

export const config = { schedule: '@hourly' };
