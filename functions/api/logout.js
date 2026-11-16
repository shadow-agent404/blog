import { json, requireSameOrigin } from '../_lib/http.js';
import { destroySession } from '../_lib/session.js';

export async function onRequestPost({ request, env }) {
  if (!requireSameOrigin(request)) {
    return json({ error: 'origin_not_allowed' }, { status: 403 });
  }

  const cookie = await destroySession(request, env);
  return json({ ok: true }, { headers: cookie ? { 'set-cookie': cookie } : {} });
}
