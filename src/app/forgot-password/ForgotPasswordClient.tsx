"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isLocale } from "@/lib/i18n";

type Step = "email" | "otp" | "reset" | "done";

export default function ForgotPasswordClient() {
  const pathname = usePathname();

  const langPrefix = useMemo(() => {
    const seg = pathname.split("/").filter(Boolean)[0];
    return seg && isLocale(seg) ? `/${seg}` : "/en";
  }, [pathname]);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          data && typeof data === "object" && "error" in data && typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Request failed";
        throw new Error(message);
      }
      setInfo("If an account exists for that email, an OTP has been sent.");
      setStep("otp");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          data && typeof data === "object" && "error" in data && typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Invalid code";
        throw new Error(message);
      }

      const tokenId =
        data && typeof data === "object" && "tokenId" in data && typeof (data as { tokenId?: unknown }).tokenId === "string"
          ? (data as { tokenId: string }).tokenId
          : null;
      const resetToken =
        data && typeof data === "object" && "resetToken" in data && typeof (data as { resetToken?: unknown }).resetToken === "string"
          ? (data as { resetToken: string }).resetToken
          : null;

      if (!tokenId || !resetToken) throw new Error("Invalid response");

      setTokenId(tokenId);
      setResetToken(resetToken);
      setStep("reset");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);

    if (password !== confirm) {
      setErr("Passwords do not match");
      return;
    }

    if (!tokenId || !resetToken) {
      setErr("Missing reset context. Please restart the flow.");
      setStep("email");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId, resetToken, password }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          data && typeof data === "object" && "error" in data && typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Reset failed";
        throw new Error(message);
      }

      setStep("done");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6">
        <h1 className="text-2xl font-semibold">Forgot password</h1>
        <p className="mt-1 text-sm text-gray-600">Reset your password with a one-time code.</p>

        {step === "email" && (
          <form onSubmit={submitEmail} className="mt-6 space-y-3">
            <div>
              <label className="text-sm">Email</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                required
              />
            </div>

            {err && <div className="text-sm text-red-600">{err}</div>}
            {info && <div className="text-sm text-gray-700">{info}</div>}

            <button disabled={loading} className="w-full rounded-lg bg-black text-white py-2 disabled:opacity-60">
              {loading ? "Sending..." : "Send OTP"}
            </button>

            <p className="text-sm text-gray-600">
              Remembered it? <Link className="underline" href={`${langPrefix}/login`}>Login</Link>
            </p>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={submitOtp} className="mt-6 space-y-3">
            <div>
              <label className="text-sm">OTP</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit code"
                inputMode="numeric"
                required
              />
            </div>

            {err && <div className="text-sm text-red-600">{err}</div>}
            {info && <div className="text-sm text-gray-700">{info}</div>}

            <button disabled={loading} className="w-full rounded-lg bg-black text-white py-2 disabled:opacity-60">
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <button
              type="button"
              className="w-full rounded-lg border py-2"
              disabled={loading}
              onClick={() => {
                setOtp("");
                setTokenId(null);
                setResetToken(null);
                setStep("email");
              }}
            >
              Start over
            </button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={submitReset} className="mt-6 space-y-3">
            <div>
              <label className="text-sm">New password</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                type="password"
                required
              />
            </div>

            <div>
              <label className="text-sm">Confirm password</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm password"
                type="password"
                required
              />
            </div>

            {err && <div className="text-sm text-red-600">{err}</div>}
            {info && <div className="text-sm text-gray-700">{info}</div>}

            <button disabled={loading} className="w-full rounded-lg bg-black text-white py-2 disabled:opacity-60">
              {loading ? "Resetting..." : "Reset password"}
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="mt-6 space-y-3">
            <div className="text-sm text-gray-700">Password updated. You can now login.</div>
            <Link className="block w-full text-center rounded-lg bg-black text-white py-2" href={`${langPrefix}/login`}>
              Go to login
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
