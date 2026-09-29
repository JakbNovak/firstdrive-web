const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

async function sbCount(table) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?select=id`, {
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      Prefer: 'count=exact',
      Range: '0-0',
    },
  });
  return parseInt(res.headers.get('Content-Range')?.split('/')[1] || '0', 10);
}

exports.handler = async () => {
  try {
    const [waitlist, orders] = await Promise.all([
      sbCount('sim_waitlist'),
      sbCount('sim_orders'),
    ]);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waitlist, orders }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'server_error' }) };
  }
};
