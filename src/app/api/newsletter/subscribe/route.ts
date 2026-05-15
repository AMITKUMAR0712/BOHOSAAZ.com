import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";

const bodySchema = z.object({
  email: z.string().trim().email().max(320),
  source: z.string().trim().min(1).max(64).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  const email = parsed.data.email.toLowerCase();
  const source = parsed.data.source;

  const subscriber = await prisma.newsletterSubscriber.upsert({
    where: { email },
    create: { email, source: source ?? "modal" },
    update: { source: source ?? undefined },
    select: { id: true, email: true, createdAt: true },
  });

  return jsonOk({ subscriber });
}
