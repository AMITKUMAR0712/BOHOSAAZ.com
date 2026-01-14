"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

type VendorSettings = {
  shopName: string;
  pickupName: string | null;
  pickupPhone: string | null;
  pickupAddress1: string | null;
  pickupAddress2: string | null;
  pickupCity: string | null;
  pickupState: string | null;
  pickupPincode: string | null;
};

export default function VendorSettingsPage() {
  const [v, setV] = useState<VendorSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let ignore = false;
    (async () => {
      const res = await fetch("/api/vendor/settings", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (ignore) return;
      if (!res.ok) {
        setMsg(data?.error || "Failed");
        setV(null);
        setLoading(false);
        return;
      }
      setV(data.vendor || null);
      setLoading(false);
    })();
    return () => {
      ignore = true;
    };
  }, []);

  async function save() {
    if (!v) return;
    setMsg(null);
    const res = await fetch("/api/vendor/settings", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pickupName: v.pickupName,
        pickupPhone: v.pickupPhone,
        pickupAddress1: v.pickupAddress1,
        pickupAddress2: v.pickupAddress2,
        pickupCity: v.pickupCity,
        pickupState: v.pickupState,
        pickupPincode: v.pickupPincode,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data?.error || "Save failed";
      setMsg(err);
      toast({ variant: "danger", title: "Save failed", message: err });
      return;
    }
    setV(data.vendor || v);
    setMsg("Saved");
    toast({ variant: "success", title: "Saved", message: "Pickup settings updated." });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>Pickup information used for logistics.</CardDescription>
      </CardHeader>

      <CardContent>
        {msg ? <div className="mb-4 text-sm text-muted-foreground">{msg}</div> : null}

        {loading ? (
          <div className="grid max-w-2xl gap-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : !v ? (
          <div className="text-sm text-muted-foreground">Not available.</div>
        ) : (
          <div className="grid max-w-2xl gap-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Shop:</span>{" "}
              <span className="font-semibold">{v.shopName}</span>
            </div>

            <div className="grid gap-2">
              <label className="text-xs text-muted-foreground">Pickup name</label>
              <Input
                value={v.pickupName || ""}
                onChange={(e) => setV({ ...v, pickupName: e.target.value || null })}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs text-muted-foreground">Pickup phone</label>
              <Input
                value={v.pickupPhone || ""}
                onChange={(e) => setV({ ...v, pickupPhone: e.target.value || null })}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs text-muted-foreground">Address line 1</label>
              <Input
                value={v.pickupAddress1 || ""}
                onChange={(e) => setV({ ...v, pickupAddress1: e.target.value || null })}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs text-muted-foreground">Address line 2</label>
              <Input
                value={v.pickupAddress2 || ""}
                onChange={(e) => setV({ ...v, pickupAddress2: e.target.value || null })}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="grid gap-2">
                <label className="text-xs text-muted-foreground">City</label>
                <Input
                  value={v.pickupCity || ""}
                  onChange={(e) => setV({ ...v, pickupCity: e.target.value || null })}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs text-muted-foreground">State</label>
                <Input
                  value={v.pickupState || ""}
                  onChange={(e) => setV({ ...v, pickupState: e.target.value || null })}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs text-muted-foreground">Pincode</label>
                <Input
                  value={v.pickupPincode || ""}
                  onChange={(e) => setV({ ...v, pickupPincode: e.target.value || null })}
                />
              </div>
            </div>

            <Button className="w-fit" variant="primary" onClick={save}>
              Save
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
