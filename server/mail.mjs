/**
 * Firefly 后端 - 验证码邮件
 *
 * 在 .env 里填 SMTP（QQ 邮箱 / 163 / Gmail 都行），验证码就会直接发到用户邮箱；
 * 没填也不会崩：验证码会打印在服务器窗口里，本机/局域网访问时前端还会自动填入，
 * 方便先把"输入邮箱 → 登录"的流程跑通。
 *
 * .env 示例：
 *   FIREFLY_SMTP_HOST=smtp.qq.com
 *   FIREFLY_SMTP_PORT=465
 *   FIREFLY_SMTP_SECURE=1
 *   FIREFLY_SMTP_USER=you@qq.com
 *   FIREFLY_SMTP_PASS=邮箱授权码（不是 QQ 密码）
 *   FIREFLY_MAIL_FROM=you@qq.com
 *   FIREFLY_MAIL_FROM_NAME=我的动漫小屋
 */
import "./env.mjs";

export function mailConfig() {
  const user = (process.env.FIREFLY_SMTP_USER || "").trim();
  const from = (process.env.FIREFLY_MAIL_FROM || user).trim();
  const port = Number(process.env.FIREFLY_SMTP_PORT || 465) || 465;
  const secureEnv = String(process.env.FIREFLY_SMTP_SECURE ?? "").toLowerCase();
  return {
    host: (process.env.FIREFLY_SMTP_HOST || "").trim(),
    port,
    secure: secureEnv ? secureEnv === "1" || secureEnv === "true" : port === 465,
    user,
    pass: process.env.FIREFLY_SMTP_PASS || "",
    from,
    fromName: (process.env.FIREFLY_MAIL_FROM_NAME || "我的动漫小屋").trim() || "我的动漫小屋",
  };
}

/** SMTP 是否配置完整（有服务器 + 发件人；需要登录时还必须有账号密码） */
export function mailConfigured() {
  const c = mailConfig();
  if (!c.host || !c.from) return false;
  if (c.user && !c.pass) return false;
  return true;
}

export function mailMode() {
  return mailConfigured() ? "smtp" : "dev";
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 发送登录 / 注册验证码
 * @param {{ to: string, code: string, minutes?: number }} opts
 * @returns {Promise<{ ok: boolean, reason?: string, error?: string }>}
 */
export async function sendLoginCode({ to, code, minutes = 10 }) {
  const cfg = mailConfig();
  if (!mailConfigured()) return { ok: false, reason: "not-configured" };

  let nodemailer;
  try {
    const mod = await import("nodemailer");
    nodemailer = mod.default ?? mod;
  } catch (e) {
    return { ok: false, reason: "nodemailer-missing", error: e.message };
  }

  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 20000,
  });

  const safeName = escapeHtml(cfg.fromName);
  const safeCode = escapeHtml(code);

  try {
    await transport.sendMail({
      from: `"${cfg.fromName}" <${cfg.from}>`,
      to,
      subject: `【${cfg.fromName}】登录验证码 ${code}`,
      text: [
        `你的登录验证码是：${code}`,
        ``,
        `${minutes} 分钟内有效，只能使用一次。`,
        `如果不是你本人操作，忽略这封邮件就好，账号不会有任何变化。`,
        ``,
        `—— ${cfg.fromName}`,
      ].join("\n"),
      html: `
        <div style="margin:0;padding:32px 16px;background:#f6f3fb;font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;">
          <div style="max-width:440px;margin:0 auto;background:#fff;border-radius:18px;padding:32px;box-shadow:0 12px 40px rgba(80,60,120,.12);">
            <div style="font-size:13px;letter-spacing:.18em;color:#a78bfa;margin-bottom:10px;">${safeName}</div>
            <h2 style="margin:0 0 18px;font-size:20px;color:#2a2350;">你的登录验证码</h2>
            <div style="font-size:34px;font-weight:700;letter-spacing:10px;color:#ff6fae;background:#fff0f7;border-radius:14px;padding:16px 10px;text-align:center;">${safeCode}</div>
            <p style="margin:18px 0 0;font-size:13px;line-height:1.8;color:#6b6478;">
              ${minutes} 分钟内有效，只能使用一次。<br />
              第一次登录会自动创建账号，不需要单独注册。<br />
              如果不是你本人操作，忽略这封邮件就好。
            </p>
          </div>
        </div>
      `,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: "send-failed", error: e.message };
  } finally {
    try {
      transport.close?.();
    } catch {
      /* ignore */
    }
  }
}
