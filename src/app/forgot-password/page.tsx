import { Suspense } from "react";
import ForgotPasswordClient from "./ForgotPasswordClient";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center p-6">Loading...</main>}>
      <ForgotPasswordClient />
    </Suspense>
  );
}
