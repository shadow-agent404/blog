import { json, readJson, redirect } from '../../_lib/http.js';
import { createSession } from '../../_lib/session.js';

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256Hex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    secret,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return toHex(signature);
}

async function verifyTelegram(payload, botToken) {
  const { hash, ...fields } = payload;
  if (!hash) return false;

  const dataCheckString = Object.keys(fields)
    .filter((key) => fields[key] !== undefined && fields[key] !== null && fields[key] !== '')
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join('\n');

  const secret = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(botToken),
  );
  const expected = await hmacSha256Hex(secret, dataCheckString);

  if (expected.length !== String(hash).length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ String(hash).charCodeAt(index);
  }
  return mismatch === 0;
}

function buildUser(payload) {
  const name = [payload.first_name, payload.last_name].filter(Boolean).join(' ') || payload.username || 'Telegram 用户';
  return {
    id: `telegram:${payload.id}`,
    name: name.slice(0, 60),
    avatar: payload.photo_url || '',
    email: '',
    provider: 'telegram',
    providerName: 'Telegram',
    url: payload.username ? `https://t.me/${payload.username}` : '',
  };
}

async function handle(payload, request, env) {
  if (!env.SESSIONS || !env.AUTH_TELEGRAM_BOT_TOKEN) {
    return { error: 'telegram_not_configured' };
  }

  if (!payload?.id || !payload?.auth_date) {
    return { error: 'telegram_invalid' };
  }

  const authDate = Number(payload.auth_date);
  if (!Number.isFinite(authDate) || Date.now() / 1000 - authDate > 86400) {
    return { error: 'telegram_expired' };
  }

  const valid = await verifyTelegram(payload, env.AUTH_TELEGRAM_BOT_TOKEN);
  if (!valid) return { error: 'telegram_signature_invalid' };

  const user = buildUser(payload);
  const { cookie } = await createSession(env, request, user);
  return { cookie, user };
}

export async function onRequestGet({ request, env }) {
  const payload = Object.fromEntries(new URL(request.url).searchParams.entries());
  const result = await handle(payload, request, env);
  if (result.error) {
    return redirect(`/login/?error=${result.error}`);
  }
  return redirect('/account/?welcome=1', { 'set-cookie': result.cookie });
}

export async function onRequestPost({ request, env }) {
  const payload = await readJson(request);
  const result = await handle(payload, request, env);
  if (result.error) {
    return json({ error: result.error }, { status: 400 });
  }
  return new Response(JSON.stringify({ ok: true, user: result.user }), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'set-cookie': result.cookie,
    },
  });
}
