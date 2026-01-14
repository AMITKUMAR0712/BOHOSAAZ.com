"use client";

import { toast as sonnerToast } from "sonner";

export const toast = {
  success: (message: string, opts?: { description?: string }) =>
    sonnerToast.success(message, { description: opts?.description }),
  error: (message: string, opts?: { description?: string }) =>
    sonnerToast.error(message, { description: opts?.description }),
  info: (message: string, opts?: { description?: string }) =>
    sonnerToast(message, { description: opts?.description }),
  promise: sonnerToast.promise,
};
