import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function audit({
  actorId,
  actorRole,
  action,
  entity,
  entityId,
  meta,
  ip,
  userAgent,
}: {
  actorId?: string;
  actorRole?: string;
  action: string;
  entity?: string;
  entityId?: string;
  meta?: Prisma.InputJsonValue;
  ip?: string;
  userAgent?: string;
}) {
  await prisma.auditLog.create({
    data: {
      actorId,
      actorRole,
      action,
      entity,
      entityId,
      meta,
      ip,
      userAgent,
    },
  });
}
