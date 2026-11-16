import { json, readJson, requireSameOrigin } from '../_lib/http.js';
import { getSession, readUserData, userKey } from '../_lib/session.js';

const digests = new Set(['weekly', 'instant', 'off']);

function normalize(value) {
  return {
    email: Boolean(value?.email),
    telegram: Boolean(value?.telegram),
    rss: value?.rss !== false,
    digest: digests.has(value?.digest) ? value.digest : 'weekly',
  };
}

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ prefs: null });

  const data = await readUserData(env, session.user.id);
  return json({ prefs: normalize(data.prefs) });
}

export async function onRequestPost({ request, env }) {
  if (!requireSameOrigin(request)) {
    return json({ error: 'origin_not_allowed' }, { status: 403 });
  }

  const session = await getSession(request, env);
  if (!session || !env.SESSIONS) {
    return json({ error: 'login_required' }, { status: 401 });
  }

  const payload = await readJson(request);
  const prefs = normalize(payload);

  await env.SESSIONS.put(userKey(session.user.id, 'prefs'), JSON.stringify(prefs));
  return json({ prefs });
}
