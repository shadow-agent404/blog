import { json, readJson, requireSameOrigin } from '../_lib/http.js';
import { getSession } from '../_lib/session.js';
import { mailerReady, sendMail } from '../_lib/mailer.js';

const MAX_ATTACHMENT_BYTES = 6 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;

export async function onRequestPost({ request, env }) {
  if (!requireSameOrigin(request)) {
    return json({ error: 'origin_not_allowed' }, { status: 403 });
  }
  if (!mailerReady(env)) {
    return json({ error: 'mail_not_configured' }, { status: 503 });
  }

  const session = await getSession(request, env);
  const email = session?.user?.email;
  if (!email) {
    return json({ error: 'login_required' }, { status: 401 });
  }

  const payload = await readJson(request);
  const subject = typeof payload?.subject === 'string' ? payload.subject.trim().slice(0, 160) : '';
  const text = typeof payload?.text === 'string' ? payload.text.slice(0, 20000) : '';
  const html = typeof payload?.html === 'string' ? payload.html.slice(0, 40000) : '';
  const rawAttachments = Array.isArray(payload?.attachments) ? payload.attachments : [];

  if (!subject || (!text && !html)) {
    return json({ error: 'invalid_message' }, { status: 400 });
  }
  if (rawAttachments.length > MAX_ATTACHMENTS) {
    return json({ error: 'too_many_attachments' }, { status: 400 });
  }

  let total = 0;
  const attachments = [];
  for (const file of rawAttachments) {
    if (!file || typeof file.filename !== 'string' || typeof file.content !== 'string') {
      return json({ error: 'invalid_attachment' }, { status: 400 });
    }
    const size = Math.floor((file.content.length * 3) / 4);
    total += size;
    if (total > MAX_ATTACHMENT_BYTES) {
      return json({ error: 'attachment_too_large' }, { status: 413 });
    }
    attachments.push({
      filename: file.filename.slice(0, 120),
      contentType: typeof file.contentType === 'string' ? file.contentType : 'application/octet-stream',
      content: file.content,
    });
  }

  try {
    const result = await sendMail(env, { to: email, subject, text, html, attachments });
    return json({ ok: true, provider: result.provider, to: email });
  } catch (error) {
    return json({ error: 'send_failed', message: '邮件发送失败。' }, { status: 502 });
  }
}
