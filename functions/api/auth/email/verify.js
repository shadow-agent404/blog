import { redirect, sha256Base64Url } from '../../../_lib/http.js';
import { createSession } from '../../../_lib/session.js';

export async function onRequestGet({ request, env }) {
  if (!env.SESSIONS) {
    return redirect('/login/?error=kv_not_configured');
  }

  const token = new URL(request.url).searchParams.get('token');
  if (!token || !/^[a-f0-9]{32,80}$/.test(token)) {
    return redirect('/login/?error=magic_invalid');
  }

  const raw = await env.SESSIONS.get(`magic:${token}`);
  if (!raw) {
    return redirect('/login/?error=magic_expired');
  }
  await env.SESSIONS.delete(`magic:${token}`);

  let saved;
  try {
    saved = JSON.parse(raw);
  } catch {
    return redirect('/login/?error=magic_invalid');
  }

  if (!saved?.email) {
    return redirect('/login/?error=magic_invalid');
  }

  const local = saved.email.split('@')[0] || '读者';
  const hashed = await sha256Base64Url(saved.email);
  const user = {
    id: `email:${hashed.slice(0, 40)}`,
    name: local.slice(0, 40),
    avatar: '',
    email: saved.email,
    provider: 'email',
    providerName: '邮箱',
    url: '',
  };

  const { cookie } = await createSession(env, request, user);
  const next = saved.next && saved.next.startsWith('/') ? saved.next : '/account/';
  const target = new URL(next, request.url);
  target.searchParams.set('welcome', '1');

  return redirect(target.pathname + target.search, { 'set-cookie': cookie });
}
