import { authorizeUrl, getProvider, isConfigured } from '../../_lib/providers.js';
import { randomId, redirect, safeNext, sha256Base64Url } from '../../_lib/http.js';

export async function onRequestGet({ request, env, params }) {
  const providerId = params.provider;
  const provider = getProvider(providerId);

  if (!provider || provider.kind !== 'oauth') {
    return redirect('/login/?error=unsupported');
  }

  if (!isConfigured(provider, env)) {
    return redirect(`/login/?error=${providerId}_not_configured`);
  }

  if (!env.SESSIONS) {
    return redirect('/login/?error=kv_not_configured');
  }

  const state = randomId(24);
  const codeVerifier = provider.pkce ? randomId(48) : '';
  const codeChallenge = provider.pkce ? await sha256Base64Url(codeVerifier) : '';
  const next = safeNext(new URL(request.url).searchParams.get('next'));

  await env.SESSIONS.put(
    `oauth:${state}`,
    JSON.stringify({
      providerId,
      codeVerifier,
      next,
      createdAt: Date.now(),
    }),
    { expirationTtl: 10 * 60 },
  );

  const target = authorizeUrl(provider, request, env, {
    state,
    codeChallenge,
    providerId,
  });

  return redirect(target);
}

export async function onRequestPost() {
  return redirect('/login/?error=method_not_allowed');
}
