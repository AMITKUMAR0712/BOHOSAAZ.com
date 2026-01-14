import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

const schema = z.object({
  email: z.string().trim().email(),
  otp: z.string().trim().min(4).max(12),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "ip";
  const limited = await rateLimit(`auth:pw:verify:${ip}`);
  if (!limited.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  const otp = parsed.data.otp;

  let token:
    | {
        id: string;
        userId: string;
        otpHash: string;
        attempts: number;
        verifiedAt: Date | null;
      }
    | null = null;

  try {
    token = await prisma.passwordResetToken.findFirst({
      where: {
        email,
        usedAt: null,
        otpExpiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        otpHash: true,
        attempts: true,
        verifiedAt: true,
      },
    });
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e && typeof (e as { code?: unknown }).code === "string"
        ? (e as { code: string }).code
        : undefined;
    if (code === "P2021") {
      return NextResponse.json(
        { error: "Password reset is not available until database migrations are applied." },
        { status: 503 },
      );
    }
    throw e;
  }

  if (!token) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  if (token.verifiedAt) {
    return NextResponse.json({ error: "Code already verified" }, { status: 400 });
  }

  if (token.attempts >= 5) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  const ok = await bcrypt.compare(otp, token.otpHash);
  if (!ok) {
    try {
      await prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { attempts: { increment: 1 } },
      });
    } catch {
      // ignore
    }
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenHash = await bcrypt.hash(resetToken, 10);

  await prisma.passwordResetToken.update({
    where: { id: token.id },
    data: {
      verifiedAt: new Date(),
      resetTokenHash,
    },
  });

  return NextResponse.json({ ok: true, tokenId: token.id, resetToken });
}
