import nodemailer from "nodemailer";

function nonEmpty(v: string | undefined) {
  return typeof v === "string" && v.trim().length > 0 && !v.includes("...");
}

function warnOnce(message: string) {
  if (process.env.NODE_ENV === "production") return;
  const key = `__bohosaaz_notify_warn__:${message}`;
  const g = globalThis as unknown as Record<string, unknown>;
  if (g[key]) return;
  g[key] = true;
  console.warn(message);
}

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || 587); // Default port

  const hasSmtp = nonEmpty(host) && nonEmpty(user) && nonEmpty(pass);

  if (!hasSmtp) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP is not configured (set SMTP_HOST/SMTP_USER/SMTP_PASS)");
    }
    warnOnce("⚠️  [notify] SMTP env vars missing; email sending is disabled in dev.");
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host: host!.trim(),
    port,
    secure: port === 465,
    auth: {
      user: user!.trim(),
      pass: pass!.trim(),
    },
  });

  return cachedTransporter;
}

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}) {
  if (!to) return;

  const transporter = getTransporter(); // Get the transporter
  if (!transporter) return;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "no-reply@bohosaaz.com",
    to,
    replyTo,
    subject,
    html,
  });
}

// Placeholder for WhatsApp (Twilio / Meta Cloud)
export async function sendWhatsApp({
  to,
  message,
}: {
  to: string;
  message: string;
}) {
  // integrate later (Twilio / Meta API)
  console.log("WhatsApp →", to, message);
}
