import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

const schema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "ip";
  const limited = await rateLimit(`auth:register:${ip}`);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, password } = parsed.data;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hash, role: "USER" },
      select: { id: true, email: true, role: true, name: true },
    });

    const token = signToken({ sub: user.id, email: user.email, role: user.role });

  const data = { user, token };
  const res = new Response(JSON.stringify(data, (k, v) => typeof v === 'bigint' ? v.toString() : v), {
    status: 201,
    headers: { "Content-Type": "application/json" }
  });

  res.headers.append("Set-Cookie", `token=${token}; HttpOnly; Path=/; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  return res;
} catch (e: unknown) {
    const error = e instanceof Error ? e.message : "Internal server error";
    console.error("REGISTER_ERROR:", e);
    return NextResponse.json({ error, debug: String(e) }, { status: 500 });
  }
}
