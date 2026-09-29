const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
const TG_TOKEN = process.env.TG_TOKEN;
const TG_CHAT = process.env.TG_CHAT;

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

async function tg(text) {
  if (!TG_TOKEN || !TG_CHAT) return;
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'HTML' }),
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, body: 'Method Not Allowed' };

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'invalid_json' }) };
  }

  // Honeypot
  if (body.hp) return { statusCode: 200, body: JSON.stringify({ ok: true }) };

  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const location = String(body.location || '').trim();
  const interest = String(body.interest || '').trim();

  if (!name || !validateEmail(email)) {
    return { statusCode: 422, body: JSON.stringify({ error: 'validation_error' }) };
  }

  // Uložit do Supabase
  const res = await fetch(`${SB_URL}/rest/v1/sim_waitlist`, {
    method: 'POST',
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ name, email, location, interest }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { statusCode: 500, body: JSON.stringify({ error: 'db_error', detail: err }) };
  }

  // Telegram notifikace
  await tg(`🙋 <b>Nový zápis na čekací listinu</b>\n👤 ${name}\n📧 ${email}\n📍 ${location}\n⭐ ${interest}`);

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
