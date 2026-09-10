// netlify/functions/properties.js
// Liefert die oeffentlichen Listings aus Supabase in exakt der Form,
// die das Frontend bisher von Airtable erwartet hat.
// Datenquelle: View public_listings (nur Zeilen mit show_on_website = true,
// nur kaeufer-relevante Felder).

export default async function handler(request, context) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response(
      JSON.stringify({ error: 'Missing Supabase environment variables.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Numerische Spalten kommen aus PostgREST teils als String zurueck.
  // Das Frontend rechnet und formatiert mit Zahlen, also sauber casten.
  const toNumber = (value) =>
    value === null || value === undefined || value === '' ? null : Number(value);

  try {
    const endpoint = new URL(`${SUPABASE_URL}/rest/v1/public_listings`);
    endpoint.searchParams.set('select', '*');
    endpoint.searchParams.set('order', 'name.asc');

    const response = await fetch(endpoint.toString(), {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();

      return new Response(
        JSON.stringify({
          error: 'Supabase request failed.',
          details: errorText
        }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const rows = await response.json();

    // Supabase-Zeilen auf die bisherige Airtable-Form abbilden:
    // { id, fields: { ...Feldnamen wie zuvor... } }
    const records = rows.map((row) => ({
      id: row.id,
      fields: {
        Name: row.name,
        Area: row.municipality,
        Barangay: row.barangay,
        Type: row.type,
        Category: row.category || '',
        Title_Status: row.title_status,
        Listing_Status: row.listing_status,
        Electricity: row.electricity || '',
        Water: row.water || '',
        Selling_Price: toNumber(row.price_total_php),
        SQM_Price: toNumber(row.price_per_sqm_php),
        Lot_SQM: toNumber(row.lot_size_sqm),
        Build_SQM: toNumber(row.structure_size_sqm),
        Build_Text: row.build_area_text || '',
        Description: row.description,
        Features: Array.isArray(row.tags) ? row.tags : [],
        // Frontend erwartet Bilder als Objekte mit .url (wie Airtable-Anhaenge)
        Images: Array.isArray(row.photos)
          ? row.photos.map((url) => ({ url }))
          : [],
        Video_URL:
          Array.isArray(row.videos) && row.videos.length > 0 ? row.videos[0] : '',
        Maps_Link: row.map_url || ''
      }
    }));

    return new Response(
      JSON.stringify({ records }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60'
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Server error while loading properties.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
