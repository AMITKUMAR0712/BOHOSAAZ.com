import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user?.id) {
      return NextResponse.json({ currency: "INR" });
    }

    const preference = await prisma.userPreference.findUnique({
      where: { userId: user.id },
      select: { currency: true },
    });

    return NextResponse.json({ currency: preference?.currency || "INR" });
  } catch (error) {
    console.error("[GET /api/user/currency]", error);
    return NextResponse.json({ currency: "INR" });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currency } = await req.json();

    if (!currency || (currency !== "INR" && currency !== "USD")) {
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
    }

    const preference = await prisma.userPreference.upsert({
      where: { userId: user.id },
      update: { currency },
      create: { userId: user.id, currency },
    });

    return NextResponse.json({ currency: preference.currency });
  } catch (error) {
    console.error("[POST /api/user/currency]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
