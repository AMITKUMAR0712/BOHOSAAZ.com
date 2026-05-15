import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const ADDRESS_COOKIE = "shippingAddress";

type AddressCookie = {
  fullName?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  [k: string]: unknown;
};

function safeParseJson<T>(value: string | undefined | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const address = safeParseJson<AddressCookie>(req.cookies.get(ADDRESS_COOKIE)?.value) || null;
  return NextResponse.json({ address });
}

export async function PATCH(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = body?.name != null ? String(body.name).trim() : null;
  const phone = body?.phone != null ? String(body.phone).trim() : null;
  const address = body?.address ?? null;

  if (name !== null && name.length > 200) {
    return NextResponse.json({ error: "Name too long" }, { status: 400 });
  }
  if (phone !== null && phone.length > 30) {
    return NextResponse.json({ error: "Phone too long" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(name !== null ? { name } : {}),
      ...(phone !== null ? { phone } : {}),
    },
  });

  const res = NextResponse.json({ ok: true });

  if (address) {
    res.cookies.set(ADDRESS_COOKIE, JSON.stringify(address), {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return res;
}
