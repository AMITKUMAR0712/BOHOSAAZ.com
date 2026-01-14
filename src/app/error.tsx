"use client";

import * as React from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-2xl px-4 py-16">
          <h1 className="font-heading text-2xl">Something went wrong</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Please refresh the page. If the issue persists, contact support.
          </p>
          {process.env.NODE_ENV !== "production" ? (
            <pre className="mt-6 overflow-auto rounded-(--radius) border border-border bg-card p-4 text-xs">
              {String(error?.message || error)}
              {error?.digest ? `\n\nDigest: ${error.digest}` : ""}
            </pre>
          ) : null}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              className="rounded-(--radius) border border-border bg-card px-4 py-2 text-sm hover:bg-muted/40"
              onClick={() => reset()}
            >
              Try again
            </button>
            <Link
              className="rounded-(--radius) border border-border bg-card px-4 py-2 text-sm hover:bg-muted/40"
              href="/"
            >
              Go home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
