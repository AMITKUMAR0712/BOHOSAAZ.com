import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { sendEmail } from "@/lib/notify";
import type { ContactMessageStatus } from "@prisma/client";

class NotFoundError extends Error {
  override name = "NotFoundError";
}

const patchSchema = z
  .object({
    status: z.enum(["OPEN", "REPLIED", "CLOSED"]).optional(),
    adminReply: z.string().trim().max(5000).optional(),
    sendEmail: z.coerce.boolean().optional().default(true),
  })
  .superRefine((val, ctx) => {
    if (val.adminReply != null && val.adminReply.trim().length === 0) {
      ctx.addIssue({ code: "custom", message: "Reply cannot be empty", path: ["adminReply"] });
    }
  });

export async function PATCH(req: Request, ctx: { params: Promise<{ messageId: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { messageId } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  const { status, adminReply, sendEmail: shouldSendEmail } = parsed.data;

  const ip = req.headers.get("x-forwarded-for") || undefined;
  const userAgent = req.headers.get("user-agent") || undefined;

  let result: {
    message: { id: string; status: string; adminReply: string | null; repliedAt: string | null; createdAt: string };
    email: { to: string; name: string; subject: string; originalMessage: string };
  };

  try {
    result = await prisma.$transaction(async (tx) => {
      const msg = await tx.contactMessage.findUnique({
        where: { id: messageId },
        select: {
          id: true,
          name: true,
          email: true,
          subject: true,
          message: true,
          status: true,
        },
      });
      if (!msg) {
        throw new NotFoundError("Not found");
      }

      const nextStatus: ContactMessageStatus = (adminReply != null ? "REPLIED" : status ?? msg.status) as ContactMessageStatus;

      const updated = await tx.contactMessage.update({
        where: { id: messageId },
        data: {
          status: nextStatus,
          adminReply: adminReply != null ? adminReply : undefined,
          repliedAt: adminReply != null ? new Date() : undefined,
        },
        select: {
          id: true,
          status: true,
          adminReply: true,
          repliedAt: true,
          createdAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          actorRole: admin.role,
          action: adminReply != null ? "CONTACT_REPLY" : "CONTACT_STATUS",
          entity: "ContactMessage",
          entityId: updated.id,
          meta: {
            to: msg.email,
            status: updated.status,
            hasReply: adminReply != null,
          },
          ip,
          userAgent,
        },
      });

      return {
        message: {
          id: updated.id,
          status: updated.status,
          adminReply: updated.adminReply,
          repliedAt: updated.repliedAt ? updated.repliedAt.toISOString() : null,
          createdAt: updated.createdAt.toISOString(),
        },
        email: { to: msg.email, name: msg.name, subject: msg.subject, originalMessage: msg.message },
      };
    });
  } catch (e: unknown) {
    if (e instanceof NotFoundError) return jsonError("Not found", 404);
    return jsonError("Failed to update message", 500);
  }

  if (adminReply != null && shouldSendEmail) {
    await sendEmail({
      to: result.email.to,
      subject: `Re: ${result.email.subject || "Your message to Bohosaaz"}`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">
          <p>Hi ${escapeHtml(result.email.name || "there")},</p>
          <p>${nl2br(escapeHtml(adminReply))}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb" />
          <p style="color:#6b7280;font-size:12px"><b>Your original message:</b><br/>${nl2br(
            escapeHtml(result.email.originalMessage || "")
          )}</p>
        </div>
      `,
    });
  }

  return jsonOk({ message: result.message });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ messageId: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { messageId } = await ctx.params;

  const ip = req.headers.get("x-forwarded-for") || undefined;
  const userAgent = req.headers.get("user-agent") || undefined;

  try {
    await prisma.$transaction(async (tx) => {
      const msg = await tx.contactMessage.findUnique({
        where: { id: messageId },
        select: { id: true, email: true, subject: true, status: true },
      });
      if (!msg) {
        throw new NotFoundError("Not found");
      }

      await tx.contactMessage.delete({ where: { id: messageId } });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          actorRole: admin.role,
          action: "CONTACT_DELETE",
          entity: "ContactMessage",
          entityId: msg.id,
          meta: { to: msg.email, subject: msg.subject, status: msg.status },
          ip,
          userAgent,
        },
      });
    });
  } catch (e: unknown) {
    if (e instanceof NotFoundError) return jsonError("Not found", 404);
    return jsonError("Failed to delete message", 500);
  }

  return jsonOk({ deleted: true });
}

function nl2br(s: string) {
  return s.replace(/\n/g, "<br/>");
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
