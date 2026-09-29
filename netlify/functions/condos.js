// netlify/functions/condos.js
// Serves public condo data for the website:
//   - types: one row per project x unit-type (price range, available count, photos)
//   - units: available units (floor, type, price) for the interactive tower widget
// Sources: Supabase views condo_website_types and condo_units_public.

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
  })
}

export default async function handler() {
  const SUPABASE_URL = process.env.SUPABASE_URL
  const KEY = process.env.SUPABASE_ANON_KEY
  if (!SUPABASE_URL || !KEY) {
    return json({ error: 'Missing Supabase environment variables.' }, 500)
  }
  const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` }

  try {
    const [tRes, uRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/condo_website_types?select=*`, { headers }),
      fetch(
        `${SUPABASE_URL}/rest/v1/condo_units_public?select=project_id,floor,floor_label,unit_type,floor_area_sqm,price_php,status&status=eq.available`,
        { headers },
      ),
    ])

    if (!tRes.ok) {
      return json({ error: 'Supabase request failed (types).', details: await tRes.text() }, tRes.status)
    }
    if (!uRes.ok) {
      return json({ error: 'Supabase request failed (units).', details: await uRes.text() }, uRes.status)
    }

    const types = await tRes.json()
    const units = await uRes.json()
    return json({ types, units }, 200)
  } catch (err) {
    return json({ error: 'Server error while loading condos.' }, 500)
  }
}
