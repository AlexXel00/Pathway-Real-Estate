export default async function handler(request, context) {
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME;

  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_NAME) {
    return new Response(
      JSON.stringify({
        error: 'Missing Airtable environment variables.'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }

  const records = [];
  let offset;

  try {
    do {
      const airtableUrl = new URL(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`
      );

      airtableUrl.searchParams.set(
        'filterByFormula',
        "AND({Name} != '', {Listing_Status} = 'Active')"
      );

      airtableUrl.searchParams.set('sort[0][field]', 'Name');
      airtableUrl.searchParams.set('sort[0][direction]', 'asc');

      if (offset) {
        airtableUrl.searchParams.set('offset', offset);
      }

      const response = await fetch(airtableUrl.toString(), {
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();

        return new Response(
          JSON.stringify({
            error: 'Airtable request failed.',
            details: errorText
          }),
          {
            status: response.status,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      }

      const data = await response.json();

      records.push(...data.records);
      offset = data.offset;
    } while (offset);

    return new Response(
      JSON.stringify({
        records
      }),
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
      JSON.stringify({
        error: 'Server error while loading properties.'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}
