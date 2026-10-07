// netlify/functions/alerts-send.js
// Runs every hour. Finds listings that appeared on the website since the last run,
// emails every confirmed subscriber whose choices match (one email per person, listing
// all new matches), and records the listings as announced. Subscribers who signed up on a
// German page get the email in German.

import { rpc, sendMail, canSendMail, layout, listingCard, localize, SITE } from '../lib/alerts-lib.js';

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
      if (!byEmail.has(r.email)) byEmail.set(r.email, { token: r.unsubscribe_token, lang: r.lang === 'de' ? 'de' : 'en', items: [] });
      byEmail.get(r.email).items.push(item);
    }
  }

  const sentTo = [];
  for (const [email, { token, lang, items: raw }] of byEmail) {
    const de = lang === 'de';
    const list = raw.map((i) => localize(i, lang));
    const unsubscribeUrl = `${SITE}/api/alerts/unsubscribe?token=${token}${de ? '&lang=de' : ''}`;
    const one = list.length === 1;
    const subject = de
      ? (one ? `Neues Angebot: ${list[0].name}` : `${list.length} neue Angebote auf Palawan`)
      : (one ? `New listing: ${list[0].name}` : `${list.length} new listings in Palawan`);
    try {
      await sendMail(de ? {
        to: email,
        subject,
        unsubscribeUrl,
        html: layout({
          lang: 'de',
          preheader: one ? `${list[0].name}, neu bei Pathway Real Estate.` : 'Neue Angebote, die zu Ihrer Suche passen.',
          title: one ? 'Ein neues Angebot für Sie' : 'Neue Angebote für Sie',
          intro: one
            ? 'Soeben ist ein neues Angebot online gegangen, das zu Ihrer Suche passt. Antworten Sie einfach auf diese E-Mail oder schreiben Sie uns über WhatsApp, wenn Sie mehr erfahren oder einen Besichtigungstermin vereinbaren möchten.'
            : 'Soeben sind neue Angebote online gegangen, die zu Ihrer Suche passen. Antworten Sie einfach auf diese E-Mail oder schreiben Sie uns über WhatsApp, wenn Sie mehr erfahren oder einen Besichtigungstermin vereinbaren möchten.',
          body: list.map((i) => listingCard(i, 'de')).join(''),
          footerNote: `Sie erhalten diese E-Mail, weil Sie sich auf pathwayphilippines.com für Benachrichtigungen über neue Angebote angemeldet haben. <a href="${unsubscribeUrl}" style="color:#7e6454;">Abmelden</a>`
        }),
        text: list.map((i) => `${i.name} (${[i.barangay, i.municipality].filter(Boolean).join(', ')})\n${SITE}${i.link}`).join('\n\n') +
          `\n\nAbmelden: ${unsubscribeUrl}`
      } : {
        to: email,
        subject,
        unsubscribeUrl,
        html: layout({
          preheader: one ? `${list[0].name}, just listed on Pathway Real Estate.` : 'New listings that match your alert.',
          title: one ? 'A new listing for you' : 'New listings for you',
          intro: one
            ? 'A new listing that matches your alert has just gone online. Reply to this email or message us on WhatsApp if you would like more details or a viewing.'
            : 'New listings that match your alert have just gone online. Reply to this email or message us on WhatsApp if you would like more details or a viewing.',
          body: list.map((i) => listingCard(i)).join(''),
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
