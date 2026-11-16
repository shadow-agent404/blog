import { getCookie, randomId, serializeCookie } from './http.js';

export const SESSION_COOKIE = 'sa_session';
const SESSION_TTL = 60 * 60 * 24 * 30;

export async function createSession(env, request, user) {
  if (!env.SESSIONS) throw new Error('kv_not_configured');
  const id = randomId(32);
  const record = {
    id,
    user,
    createdAt: Date.now(),
  };
  await env.SESSIONS.put(`session:${id}`, JSON.stringify(record), {
    expirationTtl: SESSION_TTL,
  });

  const secure = new URL(request.url).protocol === 'https:';
  const cookie = serializeCookie(SESSION_COOKIE, id, {
    maxAge: SESSION_TTL,
    path: '/',
    httpOnly: true,
    secure,
    sameSite: 'Lax',
  });
  return { id, cookie };
}

export async function getSession(request, env) {
  if (!env.SESSIONS) return null;
  const id = getCookie(request, SESSION_COOKIE);
  if (!id || !/^[a-f0-9]{32,80}$/.test(id)) return null;
  const raw = await env.SESSIONS.get(`session:${id}`);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    if (!session?.user?.id) return null;
    return session;
  } catch {
    return null;
  }
}

export async function destroySession(request, env) {
  if (!env.SESSIONS) return '';
  const id = getCookie(request, SESSION_COOKIE);
  if (id) await env.SESSIONS.delete(`session:${id}`);
  return serializeCookie(SESSION_COOKIE, '', {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure: new URL(request.url).protocol === 'https:',
    sameSite: 'Lax',
  });
}

export function userKey(userId, suffix) {
  return `user:${userId}:${suffix}`;
}

export async function readUserData(env, userId) {
  if (!env.SESSIONS || !userId) {
    return { bookmarks: [], history: [], likes: [], prefs: {} };
  }
  const [bookmarks, history, likes, prefs] = await Promise.all([
    env.SESSIONS.get(userKey(userId, 'bookmarks')),
    env.SESSIONS.get(userKey(userId, 'history')),
    env.SESSIONS.get(userKey(userId, 'likes')),
    env.SESSIONS.get(userKey(userId, 'prefs')),
  ]);

  const parse = (value, fallback) => {
    if (!value) return fallback;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  };

  return {
    bookmarks: parse(bookmarks, []),
    history: parse(history, []),
    likes: parse(likes, []),
    prefs: parse(prefs, {}),
  };
}
