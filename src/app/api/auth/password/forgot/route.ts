import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { sendEmail } from "@/lib/notify";

const schema = z.object({
  email: z.string().trim().email(),
});

function generateOtp(): string {
  // 6-digit numeric OTP
  const n = crypto.randomInt(100000, 1000000);
  return String(n).padStart(6, "0");
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "ip";
  const limited = await rateLimit(`auth:pw:forgot:${ip}`);
  if (!limited.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();

  // Always return ok to avoid user enumeration.
  const okRes = NextResponse.json({ ok: true });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, isBlocked: true },
  });

  if (!user || user.isBlocked) return okRes;

  const emailLimited = await rateLimit(`auth:pw:forgot:email:${email}`);
  if (!emailLimited.success) return okRes;

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  try {
    // Keep only the most recent pending token.
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        email: user.email,
        otpHash,
        otpExpiresAt,
      },
    });
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e && typeof (e as { code?: unknown }).code === "string"
        ? (e as { code: string }).code
        : undefined;
    // Prisma P2021: table does not exist (migrations not applied)
    if (code === "P2021") return okRes;
    throw e;
  }

  await sendEmail({
    to: user.email,
    subject: "Your Bohosaaz password reset code",
    html: `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height: 1.5">
        <h2 style="margin:0 0 12px">Password reset</h2>
        <p style="margin:0 0 12px">Use this one-time code to reset your Bohosaaz password:</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 12px 0">${otp}</div>
        <p style="margin:0 0 12px">This code expires in 10 minutes.</p>
        <p style="margin:0; color:#666">If you didn’t request this, you can ignore this email.</p>
      </div>
    `,
  });

  return okRes;
}
