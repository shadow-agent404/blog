import { json } from '../../_lib/http.js';
import { listProviders } from '../../_lib/providers.js';

export async function onRequestGet({ env }) {
  return json({
    providers: listProviders(env),
    kvReady: Boolean(env.SESSIONS),
    telegramBot: env.AUTH_TELEGRAM_BOT_USERNAME || '',
  });
}
