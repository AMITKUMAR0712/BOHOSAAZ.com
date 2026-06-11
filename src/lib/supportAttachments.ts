import { z } from "zod";

export const supportAttachmentSchema = z.object({
  url: z.string().trim().min(1).max(2048),
  name: z.string().trim().min(1).max(255),
  type: z.string().trim().max(120).optional(),
  size: z.number().int().nonnegative().max(12 * 1024 * 1024).optional(),
});

export const supportAttachmentsSchema = z.array(supportAttachmentSchema).max(5).optional().default([]);

export type SupportAttachment = z.infer<typeof supportAttachmentSchema>;

export function attachmentsOrNull(attachments: SupportAttachment[]) {
  return attachments.length ? attachments : undefined;
}
