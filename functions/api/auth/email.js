import { absoluteUrl, json, readJson, requireSameOrigin, safeNext } from '../../_lib/http.js';
import { randomId } from '../../_lib/http.js';
import { mailerReady, sendMail } from '../../_lib/mailer.js';

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function onRequestPost({ request, env }) {
  if (!requireSameOrigin(request)) {
    return json({ error: 'origin_not_allowed' }, { status: 403 });
  }

  if (!mailerReady(env) || !env.SESSIONS) {
    return json(
      {
        error: 'email_not_configured',
        message: '邮件登录需要配置 QQ_SMTP_USER / QQ_SMTP_PASS，或 RESEND_API_KEY 与 AUTH_EMAIL_FROM。',
      },
      { status: 503 },
    );
  }

  const payload = await readJson(request);
  const email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const next = safeNext(payload?.next);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 160) {
    return json({ error: 'invalid_email', message: '邮箱格式不正确。' }, { status: 400 });
  }

  const ip =
    request.headers.get('cf-connecting-ip') ||
    (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'unknown';
  const rateKey = `ratelimit:email:${ip}`;
  if (await env.SESSIONS.get(rateKey)) {
    return json(
      { error: 'rate_limited', message: '请求太频繁，请一分钟后再试。' },
      { status: 429 },
    );
  }
  await env.SESSIONS.put(rateKey, '1', { expirationTtl: 60 });

  const token = randomId(32);
  await env.SESSIONS.put(
    `magic:${token}`,
    JSON.stringify({ email, next, createdAt: Date.now() }),
    { expirationTtl: 15 * 60 },
  );

  const link = absoluteUrl(request, `/api/auth/email/verify?token=${token}`);
  const safeLink = escapeHtml(link);

  try {
    await sendMail(env, {
      to: email,
      subject: '登录到 S.A',
      text: `点击这个链接登录 S.A：\n${link}\n\n链接 15 分钟内有效。如果不是你本人操作，忽略这封邮件即可。`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f2eadc;padding:32px;color:#171512">
          <div style="max-width:520px;margin:0 auto;background:#fbf7ee;border:1px solid #cdc3b1;padding:32px">
            <p style="font-family:monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#71685a;margin:0 0 16px">S.A / 登录链接</p>
            <h1 style="font-family:Georgia,serif;font-size:28px;line-height:1.2;margin:0 0 16px;font-weight:500">点一下，就进去。</h1>
            <p style="font-size:15px;line-height:1.8;color:#3c3831;margin:0 0 24px">这个链接 15 分钟内有效。不需要密码，也不需要注册。</p>
            <a href="${safeLink}" style="display:inline-block;background:#171512;color:#fbf7ee;padding:12px 22px;text-decoration:none;font-size:14px">登录 S.A</a>
            <p style="font-size:12px;line-height:1.7;color:#71685a;margin:24px 0 0">如果不是你本人操作，忽略这封邮件即可。链接只对 ${escapeHtml(email)} 有效。</p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    await env.SESSIONS.delete(`magic:${token}`);
    return json(
      { error: 'send_failed', message: '邮件发送失败，请稍后再试。' },
      { status: 502 },
    );
  }

  return json({ ok: true, message: '登录链接已发送，请检查收件箱和垃圾邮件。' });
}
