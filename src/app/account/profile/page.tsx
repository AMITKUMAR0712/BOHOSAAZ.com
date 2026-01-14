"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Me = {
  user?: {
    id?: string;
    name?: string | null;
    email?: string;
    role?: string;
  };
};

export default function AccountProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setError(null);
      const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
      const data = (await res.json().catch(() => null)) as Me | null;
      if (!mounted) return;
      if (!res.ok || !data) {
        setError("Failed to load profile");
        setMe(null);
        return;
      }
      setMe(data);
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your personal details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>This is a minimal, production-safe starter page.</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? <div className="text-sm text-danger">{error}</div> : null}
          <div className="grid gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Name:</span> {me?.user?.name ?? "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span> {me?.user?.email ?? "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Role:</span> {me?.user?.role ?? "—"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
