"use client";

import { Toaster } from "sonner";

export default function SonnerToaster() {
  return (
    <Toaster
      position="top-right"
      closeButton
      richColors
      expand
      duration={3500}
    />
  );
}
