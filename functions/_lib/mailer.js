import { connect } from 'cloudflare:sockets';

/**
 * 统一发信层：优先 QQ 邮箱 SMTP（支持附件），未配置时回退 Resend。
 * QQ 邮箱需要在设置中开启 SMTP 服务，并使用「授权码」而不是登录密码。
 */

const encoder = new TextEncoder();

function base64(value) {
  const bytes = typeof value === 'string' ? encoder.encode(value) : value;
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function encodeWord(value) {
  return /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${base64(value)}?=`;
}

function wrap76(value) {
  return value.replace(/(.{76})/g, '$1\r\n');
}

function dotStuff(value) {
  return value.replace(/^\./gm, '..');
}

class SmtpSession {
  constructor(socket) {
    this.socket = socket;
    this.reader = socket.readable.getReader();
    this.writer = socket.writable.getWriter();
    this.decoder = new TextDecoder();
    this.buffer = '';
  }

  takeReply() {
    const lines = this.buffer.split('\r\n');
    for (let i = 0; i < lines.length - 1; i += 1) {
      if (/^\d{3} /.test(lines[i])) {
        const text = lines.slice(0, i + 1).join('\r\n');
        this.buffer = lines.slice(i + 1).join('\r\n');
        return { code: Number(lines[i].slice(0, 3)), text };
      }
    }
    return null;
  }

  async readReply(timeoutMs = 20000) {
    const deadline = Date.now() + timeoutMs;
    while (true) {
      const reply = this.takeReply();
      if (reply) return reply;
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new Error('smtp_timeout');
      const result = await Promise.race([
        this.reader.read(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('smtp_timeout')), remaining)),
      ]);
      if (result.done) throw new Error('smtp_closed');
      this.buffer += this.decoder.decode(result.value, { stream: true });
    }
  }

  async command(line, expected) {
    await this.writer.write(encoder.encode(`${line}\r\n`));
    const reply = await this.readReply();
    if (expected && !expected.includes(reply.code)) {
      throw new Error(`smtp_${reply.code}`);
    }
    return reply;
  }

  close() {
    try {
      this.reader.releaseLock();
      this.writer.releaseLock();
      this.socket.close();
    } catch {
      /* 已关闭 */
    }
  }
}

function buildMessage({ from, to, subject, text, html, attachments }) {
  const domain = from.split('@')[1] || 'tenyearmc.top';
  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@${domain}>`;
  const headers = [
    `From: ${encodeWord('S.A')} <${from}>`,
    `To: <${to}>`,
    `Subject: ${encodeWord(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    'MIME-Version: 1.0',
  ];

  const altBoundary = `alt_${Date.now().toString(36)}`;
  const alternative = [
    `--${altBoundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(base64(text || '')),
    `--${altBoundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(base64(html || text || '')),
    `--${altBoundary}--`,
    '',
  ].join('\r\n');

  if (!attachments || attachments.length === 0) {
    headers.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
    return `${headers.join('\r\n')}\r\n\r\n${alternative}`;
  }

  const mixedBoundary = `mix_${Date.now().toString(36)}`;
  const parts = [
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    '',
    alternative,
  ];

  for (const file of attachments) {
    parts.push(
      `--${mixedBoundary}`,
      `Content-Type: ${file.contentType || 'application/octet-stream'}; name="${encodeWord(file.filename)}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${encodeWord(file.filename)}"`,
      '',
      wrap76(typeof file.content === 'string' ? file.content : base64(file.content)),
      '',
    );
  }

  parts.push(`--${mixedBoundary}--`, '');
  headers.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);
  return `${headers.join('\r\n')}\r\n\r\n${parts.join('\r\n')}`;
}

async function sendViaQQ(env, message) {
  const host = env.QQ_SMTP_HOST || 'smtp.qq.com';
  const port = Number(env.QQ_SMTP_PORT || 465);
  const user = env.QQ_SMTP_USER;
  const pass = env.QQ_SMTP_PASS;
  const from = env.QQ_SMTP_FROM || user;

  const socket = connect(
    { hostname: host, port },
    { secureTransport: 'on' },
  );
  const session = new SmtpSession(socket);

  try {
    await session.readReply();
    await session.command(`EHLO blog.tenyearmc.top`, [250]);
    await session.command('AUTH LOGIN', [334]);
    await session.command(base64(user), [334]);
    await session.command(base64(pass), [235]);
    await session.command(`MAIL FROM:<${from}>`, [250]);
    await session.command(`RCPT TO:<${message.to}>`, [250, 251]);
    await session.command('DATA', [354]);

    const payload = buildMessage({ ...message, from });
    await session.writer.write(encoder.encode(`${dotStuff(payload)}\r\n.\r\n`));
    const stored = await session.readReply(30000);
    if (stored.code !== 250) throw new Error(`smtp_${stored.code}`);

    await session.command('QUIT', [221]).catch(() => {});
    return { provider: 'qq', from };
  } finally {
    session.close();
  }
}

async function sendViaResend(env, message) {
  const from = env.AUTH_EMAIL_FROM;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: (message.attachments || []).map((file) => ({
        filename: file.filename,
        content: typeof file.content === 'string' ? file.content : base64(file.content),
      })),
    }),
  });

  if (!response.ok) {
    throw new Error(`resend_${response.status}`);
  }
  return { provider: 'resend', from };
}

export function mailerReady(env) {
  return Boolean(
    (env.QQ_SMTP_USER && env.QQ_SMTP_PASS) ||
      (env.RESEND_API_KEY && env.AUTH_EMAIL_FROM),
  );
}

export async function sendMail(env, message) {
  if (env.QQ_SMTP_USER && env.QQ_SMTP_PASS) {
    return sendViaQQ(env, message);
  }
  if (env.RESEND_API_KEY && env.AUTH_EMAIL_FROM) {
    return sendViaResend(env, message);
  }
  throw new Error('mail_not_configured');
}
