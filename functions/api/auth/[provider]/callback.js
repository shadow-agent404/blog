import { exchangeCode, fetchUser, getProvider, isConfigured } from '../../../_lib/providers.js';
import { redirect } from '../../../_lib/http.js';
import { createSession } from '../../../_lib/session.js';

export async function onRequestGet({ request, env, params }) {
  const providerId = params.provider;
  const provider = getProvider(providerId);
  const url = new URL(request.url);
  const providerError = url.searchParams.get('error');

  if (providerError) {
    return redirect(`/login/?error=${encodeURIComponent(providerError)}`);
  }

  if (!provider || provider.kind !== 'oauth' || !isConfigured(provider, env) || !env.SESSIONS) {
    return redirect('/login/?error=auth_not_configured');
  }

  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');

  if (!state || !code) {
    return redirect('/login/?error=missing_code');
  }

  const raw = await env.SESSIONS.get(`oauth:${state}`);
  if (!raw) {
    return redirect('/login/?error=state_expired');
  }
  await env.SESSIONS.delete(`oauth:${state}`);

  let saved;
  try {
    saved = JSON.parse(raw);
  } catch {
    return redirect('/login/?error=state_invalid');
  }

  if (saved.providerId !== providerId) {
    return redirect('/login/?error=state_mismatch');
  }

  try {
    const token = await exchangeCode(provider, request, env, {
      code,
      codeVerifier: saved.codeVerifier || '',
      providerId,
    });
    const info = await fetchUser(provider, env, token);

    const user = {
      id: `${providerId}:${info.id}`,
      name: info.name || provider.name,
      avatar: info.avatar || '',
      email: info.email || '',
      provider: providerId,
      providerName: provider.name,
      url: info.url || '',
    };

    const { cookie } = await createSession(env, request, user);
    const next = saved.next && saved.next.startsWith('/') ? saved.next : '/account/';
    const target = new URL(next, request.url);
    target.searchParams.set('welcome', '1');

    return redirect(target.pathname + target.search, { 'set-cookie': cookie });
  } catch {
    return redirect(`/login/?error=${providerId}_failed`);
  }
}
