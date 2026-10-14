// netlify/functions/properties.js
// Liefert die oeffentlichen Listings aus Supabase in exakt der Form,
// die das Frontend bisher von Airtable erwartet hat.
// Datenquelle: View public_listings (nur Zeilen mit show_on_website = true,
// nur kaeufer-relevante Felder).

// The portal stores a lot shape either as drawn corner points + lengths (current) or, for older
// entries, as survey bearing + distance per side. The page only needs points and lengths.
function normalizeLotShape(shape) {
  if (!shape || typeof shape !== 'object') return null;
  if (Array.isArray(shape.points) && shape.points.length >= 3) {
    const points = shape.points
      .filter((p) => Array.isArray(p) && p.length === 2 && p.every((n) => Number.isFinite(Number(n))))
      .map((p) => [Number(p[0]), Number(p[1])]);
    if (points.length < 3) return null;
    const lengths = points.map((p, i) => {
      const given = Array.isArray(shape.lengths) ? Number(shape.lengths[i]) : NaN;
      if (given > 0) return given;
      const q = points[(i + 1) % points.length];
      return Math.hypot(q[0] - p[0], q[1] - p[1]);
    });
    return { points, lengths, north: Boolean(shape.north) };
  }
  if (Array.isArray(shape.sides) && shape.sides.length >= 3) {
    const points = [];
    let x = 0;
    let y = 0;
    for (const s of shape.sides) {
      points.push([x, y]);
      const a = Number(s.deg || 0) + Number(s.min || 0) / 60 + Number(s.sec || 0) / 3600;
      let az = a;
      if (s.ns === 'S' && s.ew === 'E') az = 180 - a;
      else if (s.ns === 'S' && s.ew === 'W') az = 180 + a;
      else if (s.ns === 'N' && s.ew === 'W') az = 360 - a;
      const r = (az * Math.PI) / 180;
      x += Number(s.dist) * Math.sin(r);
      y += Number(s.dist) * Math.cos(r);
    }
    return { points, lengths: shape.sides.map((s) => Number(s.dist)), north: true };
  }
  return null;
}

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
        Listing_Kind: row.listing_kind || 'property',
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
        Floor_Area: toNumber(row.condo_floor_area_sqm),
        Floor_Level: row.floor_level || '',
        Bedrooms: row.bedrooms || '',
        Bathrooms: toNumber(row.bathrooms),
        Amenities: Array.isArray(row.amenities) ? row.amenities : [],
        Completion_Status: row.completion_status || '',
        Description: row.description,
        // German versions for the German website (empty when not entered in the portal)
        Name_DE: row.name_de || '',
        Description_DE: row.description_de || '',
        Build_Text_DE: row.build_area_text_de || '',
        Features: Array.isArray(row.tags) ? row.tags : [],
        // Frontend erwartet Bilder als Objekte mit .url (wie Airtable-Anhaenge)
        Images: Array.isArray(row.photos)
          ? row.photos.map((url) => ({ url }))
          : [],
        Video_URL:
          Array.isArray(row.videos) && row.videos.length > 0 ? row.videos[0] : '',
        Maps_Link: row.map_url || '',
        // Lot shape from the portal as { points (meters), lengths, north }, null when not entered
        Lot_Shape: normalizeLotShape(row.lot_shape)
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
