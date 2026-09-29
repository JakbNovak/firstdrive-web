const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
const TG_TOKEN = process.env.TG_TOKEN;
const TG_CHAT = process.env.TG_CHAT;

const PRICE_PER_PKG = 399;
const MAX_PKGS = 5;
const ACCOUNT = '2802954475/2010';
const IBAN = 'CZ7620100000002802954475';

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function genVS() {
  // 8místný variabilní symbol: timestamp + random
  const ts = Date.now().toString().slice(-5);
  const rnd = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return ts + rnd;
}

function spdString({ iban, amount, vs, msg }) {
  return `SPD*1.0*ACC:${iban}*AM:${amount}.00*CC:CZK*X-VS:${vs}*MSG:${msg}`;
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
  const phone = String(body.phone || '').trim();
  const pkgs = parseInt(body.pkgs, 10);

  if (!name || !validateEmail(email) || isNaN(pkgs) || pkgs < 1 || pkgs > MAX_PKGS) {
    return { statusCode: 422, body: JSON.stringify({ error: 'validation_error' }) };
  }

  // Cenu počítáme vždy na serveru
  const amount = pkgs * PRICE_PER_PKG;
  const vs = genVS();
  const spd = spdString({ iban: IBAN, amount, vs, msg: `FirstDrive-${vs}` });

  // Uložit do Supabase
  const res = await fetch(`${SB_URL}/rest/v1/sim_orders`, {
    method: 'POST',
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ name, email, phone, pkgs, amount, vs, status: 'pending' }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { statusCode: 500, body: JSON.stringify({ error: 'db_error', detail: err }) };
  }

  await tg(
    `⚡ <b>Nová objednávka předprodeje</b>\n` +
    `👤 ${name}\n📧 ${email}\n📞 ${phone || '—'}\n` +
    `🎟 ${pkgs}× balíček (${pkgs * 3} jízd)\n` +
    `💰 ${amount} Kč · VS: ${vs}\n` +
    `🏦 Čeká na platbu`
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, vs, amount, spd, account: ACCOUNT, iban: IBAN }),
  };
};
