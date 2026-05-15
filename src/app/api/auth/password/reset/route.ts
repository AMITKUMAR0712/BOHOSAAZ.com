import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

const schema = z.object({
  tokenId: z.string().trim().min(1),
  resetToken: z.string().trim().min(10),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "ip";
  const limited = await rateLimit(`auth:pw:reset:${ip}`);
  if (!limited.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { tokenId, resetToken, password } = parsed.data;

  let token:
    | {
        id: string;
        userId: string;
        verifiedAt: Date | null;
        usedAt: Date | null;
        otpExpiresAt: Date;
        resetTokenHash: string | null;
      }
    | null = null;

  try {
    token = await prisma.passwordResetToken.findUnique({
      where: { id: tokenId },
      select: {
        id: true,
        userId: true,
        verifiedAt: true,
        usedAt: true,
        otpExpiresAt: true,
        resetTokenHash: true,
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

  if (!token || token.usedAt || !token.verifiedAt || !token.resetTokenHash) {
    return NextResponse.json({ error: "Invalid or expired reset" }, { status: 400 });
  }

  if (token.otpExpiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Invalid or expired reset" }, { status: 400 });
  }

  const ok = await bcrypt.compare(resetToken, token.resetTokenHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid or expired reset" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: token.userId },
      data: { password: passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    }),
  ]);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
