export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    status: init.status || 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init.headers || {}),
    },
  });
}

export function redirect(location, headers = {}) {
  return new Response(null, {
    status: 302,
    headers: {
      location,
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

export function getCookie(request, name) {
  const cookie = request.headers.get('cookie') || '';
  for (const part of cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

export function serializeCookie(name, value, options = {}) {
  const chunks = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) chunks.push(`Max-Age=${options.maxAge}`);
  if (options.expires) chunks.push(`Expires=${options.expires.toUTCString()}`);
  if (options.path) chunks.push(`Path=${options.path}`);
  if (options.httpOnly) chunks.push('HttpOnly');
  if (options.secure) chunks.push('Secure');
  if (options.sameSite) chunks.push(`SameSite=${options.sameSite}`);
  return chunks.join('; ');
}

export async function readJson(request) {
  const type = request.headers.get('content-type') || '';
  if (!type.includes('application/json')) return null;
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function requireSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export function safeNext(value) {
  if (!value || typeof value !== 'string') return '/account/';
  if (!value.startsWith('/') || value.startsWith('//')) return '/account/';
  return value;
}

export function randomId(bytes = 24) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function sha256Base64Url(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64(value) {
  return btoa(value);
}

export function absoluteUrl(request, path) {
  return new URL(path, request.url).href;
}

export function clampText(value, max = 120) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}
