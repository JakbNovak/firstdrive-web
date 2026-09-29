const TG_TOKEN = process.env.TG_TOKEN;
const TG_CHAT = process.env.TG_CHAT;
const W3F_KEY = process.env.WEB3FORMS_KEY;

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

  if (body.hp) return { statusCode: 200, body: JSON.stringify({ ok: true }) };

  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const phone = String(body.phone || '').trim();
  const type = String(body.type || '').trim();
  const date = String(body.date || '').trim();
  const location = String(body.location || '').trim();
  const people = String(body.people || '').trim();
  const sims = String(body.sims || '').trim();

  if (!name || !validateEmail(email) || !type) {
    return { statusCode: 422, body: JSON.stringify({ error: 'validation_error' }) };
  }

  await tg(
    `🏢 <b>Nová poptávka akce</b>\n` +
    `👤 ${name}\n📧 ${email}\n📞 ${phone || '—'}\n` +
    `🎪 Typ: ${type}\n📅 Datum: ${date || '—'}\n` +
    `📍 Místo: ${location || '—'}\n👥 Lidí: ${people || '—'}\n🕹 Simy: ${sims || '—'}`
  );

  // Web3Forms jako záloha (e-mailová kopie)
  if (W3F_KEY) {
    await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_key: W3F_KEY,
        subject: `Poptávka akce – ${type} – ${name}`,
        name, email, phone, type, date, location, people, sims,
      }),
    }).catch(() => {});
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
