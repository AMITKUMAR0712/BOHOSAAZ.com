import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, signToken, type JwtPayload } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      role: true,
      vendor: { select: { status: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Heal stale role: approved vendor rows must carry VENDOR on the user.
  let role = user.role;
  if (user.vendor?.status === "APPROVED" && role === "USER") {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: "VENDOR" },
      select: { role: true },
    });
    role = updated.role;
  }

  const newToken = signToken({ sub: user.id, email: user.email, role });

  const res = NextResponse.json({ ok: true, role });
  res.cookies.set("token", newToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res;
}
