"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { z } from "zod";
import { isLocale } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type VendorStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
type KycStatus = "NOT_SUBMITTED" | "SUBMITTED" | "VERIFIED" | "REJECTED";

type Application = {
  status: "NOT_APPLIED" | VendorStatus;
  vendor: null | {
    shopName: string;
    displayName: string | null;
    shopDescription: string | null;
    logoUrl: string | null;
    status: VendorStatus;
    statusReason: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    shopAddress1: string | null;
    shopAddress2: string | null;
    shopCity: string | null;
    shopState: string | null;
    shopPincode: string | null;
    pickupName: string | null;
    pickupPhone: string | null;
    pickupAddress1: string | null;
    pickupAddress2: string | null;
    pickupCity: string | null;
    pickupState: string | null;
    pickupPincode: string | null;
  };
  kyc: null | {
    status: KycStatus;
    kycType: "INDIVIDUAL" | "BUSINESS";
    fullName: string | null;
    businessName: string | null;
    panNumber: string;
    gstin: string | null;
    aadhaarLast4: string | null;
    panImageUrl: string;
    gstCertificateUrl: string | null;
    cancelledChequeUrl: string;
    addressProofUrl: string;
    rejectionReason: string | null;
  };
  bankAccount: null | {
    accountName: string;
    accountNumber: string;
    ifsc: string;
    bankName: string;
    upiId: string | null;
  };
};

const ClientSchema = z.object({
  shopName: z.string().trim().min(3),
  displayName: z.string().trim().optional().nullable(),
  shopDescription: z.string().trim().optional().nullable(),
  contactEmail: z.string().trim().email().optional().nullable(),
  contactPhone: z.string().trim().min(7).max(20).optional().nullable(),
  shopAddress1: z.string().trim().min(3),
  shopAddress2: z.string().trim().optional().nullable(),
  shopCity: z.string().trim().min(2),
  shopState: z.string().trim().min(2),
  shopPincode: z.string().trim().min(4).max(10),
  pickupAddress1: z.string().trim().optional().nullable(),
  pickupAddress2: z.string().trim().optional().nullable(),
  pickupCity: z.string().trim().optional().nullable(),
  pickupState: z.string().trim().optional().nullable(),
  pickupPincode: z.string().trim().optional().nullable(),
  pickupName: z.string().trim().optional().nullable(),
  pickupPhone: z.string().trim().optional().nullable(),
  logoUrl: z.string().trim().url(),

  kycType: z.enum(["INDIVIDUAL", "BUSINESS"]),
  fullName: z.string().trim().optional().nullable(),
  businessName: z.string().trim().optional().nullable(),
  panNumber: z.string().trim().min(6),
  gstin: z.string().trim().optional().nullable(),
  aadhaarLast4: z.string().trim().regex(/^\d{4}$/).optional().nullable(),
  bankAccountName: z.string().trim().min(2),
  bankAccountNumber: z.string().trim().min(6),
  ifsc: z.string().trim().min(6),
  bankName: z.string().trim().min(2),
  upiId: z.string().trim().optional().nullable(),

  panImage: z.string().trim().url(),
  gstCertificate: z.string().trim().url().optional().nullable(),
  cancelledCheque: z.string().trim().url(),
  addressProof: z.string().trim().url(),
});

function StepPill({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border bg-card px-4 py-3">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{status}</div>
    </div>
  );
}

async function uploadToServer(file: File, purpose: "vendor_logo" | "vendor_kyc") {
  const form = new FormData();
  form.append("file", file);
  form.append("purpose", purpose);

  const uploadRes = await fetch("/api/upload", {
    method: "POST",
    credentials: "include",
    body: form,
  });

  const uploaded = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok) throw new Error(uploaded?.error || "Upload failed");

  const url = String(uploaded?.url || "");
  if (!url) throw new Error("Upload failed");
  return url;
}

export default function VendorApplyPage() {
  const router = useRouter();
  const pathname = usePathname();
  const seg = pathname.split("/").filter(Boolean)[0];
  const lang = seg && isLocale(seg) ? seg : "en";
  const lp = `/${lang}`;

  const [app, setApp] = useState<Application | null>(null);
  const [loadingApp, setLoadingApp] = useState(true);

  const [form, setForm] = useState<Record<string, string>>({
    shopName: "",
    displayName: "",
    shopDescription: "",
    contactEmail: "",
    contactPhone: "",
    shopAddress1: "",
    shopAddress2: "",
    shopCity: "",
    shopState: "",
    shopPincode: "",
    pickupName: "",
    pickupPhone: "",
    pickupAddress1: "",
    pickupAddress2: "",
    pickupCity: "",
    pickupState: "",
    pickupPincode: "",
    logoUrl: "",

    kycType: "INDIVIDUAL",
    fullName: "",
    businessName: "",
    panNumber: "",
    gstin: "",
    aadhaarLast4: "",
    bankAccountName: "",
    bankAccountNumber: "",
    ifsc: "",
    bankName: "",
    upiId: "",

    panImage: "",
    gstCertificate: "",
    cancelledCheque: "",
    addressProof: "",
  });

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const vendorStatus = app?.vendor?.status ?? (app?.status === "NOT_APPLIED" ? null : (app?.status as VendorStatus));
  const kycStatus = app?.kyc?.status ?? "NOT_SUBMITTED";

  const readyToSubmit = useMemo(() => {
    const parsed = ClientSchema.safeParse({
      ...form,
      gstCertificate: form.gstCertificate || null,
      displayName: form.displayName || null,
      shopDescription: form.shopDescription || null,
      contactEmail: form.contactEmail || null,
      contactPhone: form.contactPhone || null,
      shopAddress2: form.shopAddress2 || null,
      pickupName: form.pickupName || null,
      pickupPhone: form.pickupPhone || null,
      pickupAddress1: form.pickupAddress1 || null,
      pickupAddress2: form.pickupAddress2 || null,
      pickupCity: form.pickupCity || null,
      pickupState: form.pickupState || null,
      pickupPincode: form.pickupPincode || null,
      fullName: form.fullName || null,
      businessName: form.businessName || null,
      gstin: form.gstin || null,
      aadhaarLast4: form.aadhaarLast4 || null,
      upiId: form.upiId || null,
    });
    if (!parsed.success) return false;
    if (parsed.data.kycType === "INDIVIDUAL" && !parsed.data.fullName) return false;
    if (parsed.data.kycType === "BUSINESS" && !parsed.data.businessName) return false;
    return true;
  }, [form]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingApp(true);
      const res = await fetch("/api/vendor/application", { credentials: "include" });
      const json = (await res.json().catch(() => null)) as any;
      if (!mounted) return;
      if (res.ok && json?.ok) {
        setApp(json as Application);
        const v = json.vendor;
        const k = json.kyc;
        const b = json.bankAccount;

        setForm((prev) => ({
          ...prev,
          shopName: v?.shopName || prev.shopName,
          displayName: v?.displayName || "",
          shopDescription: v?.shopDescription || "",
          contactEmail: v?.contactEmail || "",
          contactPhone: v?.contactPhone || "",
          shopAddress1: v?.shopAddress1 || "",
          shopAddress2: v?.shopAddress2 || "",
          shopCity: v?.shopCity || "",
          shopState: v?.shopState || "",
          shopPincode: v?.shopPincode || "",
          pickupName: v?.pickupName || "",
          pickupPhone: v?.pickupPhone || "",
          pickupAddress1: v?.pickupAddress1 || "",
          pickupAddress2: v?.pickupAddress2 || "",
          pickupCity: v?.pickupCity || "",
          pickupState: v?.pickupState || "",
          pickupPincode: v?.pickupPincode || "",
          logoUrl: v?.logoUrl || "",

          kycType: k?.kycType || prev.kycType,
          fullName: k?.fullName || "",
          businessName: k?.businessName || "",
          panNumber: k?.panNumber || "",
          gstin: k?.gstin || "",
          aadhaarLast4: k?.aadhaarLast4 || "",
          bankAccountName: b?.accountName || prev.bankAccountName,
          bankAccountNumber: b?.accountNumber || prev.bankAccountNumber,
          ifsc: b?.ifsc || prev.ifsc,
          bankName: b?.bankName || prev.bankName,
          upiId: b?.upiId || "",

          panImage: k?.panImageUrl || "",
          gstCertificate: k?.gstCertificateUrl || "",
          cancelledCheque: k?.cancelledChequeUrl || "",
          addressProof: k?.addressProofUrl || "",
        }));
      }
      setLoadingApp(false);
    })().catch(() => setLoadingApp(false));
    return () => {
      mounted = false;
    };
  }, []);

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function uploadField(file: File, key: string, purpose: "vendor_logo" | "vendor_kyc") {
    setMsg(null);
    setBusyKey(key);
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("File must be ≤ 10MB");
      const url = await uploadToServer(file, purpose);
      setField(key, url);
      setMsg("✅ Uploaded");
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : "Upload failed"}`);
    } finally {
      setBusyKey(null);
    }
  }

  async function submit() {
    setMsg(null);
    setErrors({});

    const parsed = ClientSchema.safeParse({
      ...form,
      gstCertificate: form.gstCertificate || null,
      displayName: form.displayName || null,
      shopDescription: form.shopDescription || null,
      contactEmail: form.contactEmail || null,
      contactPhone: form.contactPhone || null,
      shopAddress2: form.shopAddress2 || null,
      pickupName: form.pickupName || null,
      pickupPhone: form.pickupPhone || null,
      pickupAddress1: form.pickupAddress1 || null,
      pickupAddress2: form.pickupAddress2 || null,
      pickupCity: form.pickupCity || null,
      pickupState: form.pickupState || null,
      pickupPincode: form.pickupPincode || null,
      fullName: form.fullName || null,
      businessName: form.businessName || null,
      gstin: form.gstin || null,
      aadhaarLast4: form.aadhaarLast4 || null,
      upiId: form.upiId || null,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0] ?? "");
        if (k) next[k] = issue.message;
      }
      if (form.kycType === "INDIVIDUAL" && !form.fullName.trim()) next.fullName = "Full name is required";
      if (form.kycType === "BUSINESS" && !form.businessName.trim()) next.businessName = "Business name is required";
      setErrors(next);
      setMsg("❌ Please fix the highlighted fields");
      return;
    }

    if (parsed.data.kycType === "INDIVIDUAL" && !parsed.data.fullName) {
      setErrors({ fullName: "Full name is required" });
      return;
    }
    if (parsed.data.kycType === "BUSINESS" && !parsed.data.businessName) {
      setErrors({ businessName: "Business name is required" });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        shop: {
          shopName: parsed.data.shopName,
          displayName: parsed.data.displayName ?? null,
          shopDescription: parsed.data.shopDescription ?? null,
          contactEmail: parsed.data.contactEmail ?? null,
          contactPhone: parsed.data.contactPhone ?? null,
          shopAddress: {
            address1: parsed.data.shopAddress1,
            address2: parsed.data.shopAddress2 ?? null,
            city: parsed.data.shopCity,
            state: parsed.data.shopState,
            pincode: parsed.data.shopPincode,
          },
          pickupAddress: parsed.data.pickupAddress1
            ? {
                name: parsed.data.pickupName ?? null,
                phone: parsed.data.pickupPhone ?? null,
                address1: parsed.data.pickupAddress1,
                address2: parsed.data.pickupAddress2 ?? null,
                city: parsed.data.pickupCity ?? null,
                state: parsed.data.pickupState ?? null,
                pincode: parsed.data.pickupPincode ?? null,
              }
            : null,
          logoUrl: parsed.data.logoUrl,
        },
        kyc: {
          kycType: parsed.data.kycType,
          fullName: parsed.data.fullName ?? null,
          businessName: parsed.data.businessName ?? null,
          panNumber: parsed.data.panNumber,
          gstin: parsed.data.gstin ?? null,
          aadhaarLast4: parsed.data.aadhaarLast4 ?? null,
          bankAccountName: parsed.data.bankAccountName,
          bankAccountNumber: parsed.data.bankAccountNumber,
          ifsc: parsed.data.ifsc,
          bankName: parsed.data.bankName,
          upiId: parsed.data.upiId ?? null,
          documents: {
            panImage: parsed.data.panImage,
            gstCertificate: parsed.data.gstCertificate ?? null,
            cancelledCheque: parsed.data.cancelledCheque,
            addressProof: parsed.data.addressProof,
          },
        },
      };

      const res = await fetch("/api/vendor/apply", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Submit failed");

      setMsg("✅ Application submitted (PENDING)");

      const appRes = await fetch("/api/vendor/application", { credentials: "include" });
      const appJson = await appRes.json().catch(() => null);
      if (appRes.ok && appJson?.ok) setApp(appJson as Application);

      router.refresh();
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : "Submit failed"}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function refreshAccess() {
    setRefreshing(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Refresh failed");
      setMsg(`✅ Refreshed. Current role: ${data?.role || "updated"}`);
      router.refresh();
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : "Refresh failed"}`);
    } finally {
      setRefreshing(false);
    }
  }

  if (vendorStatus === "APPROVED") {
    return (
      <div className="mx-auto max-w-3xl p-6 md:p-10">
        <Card>
          <CardHeader>
            <CardTitle>Become a Vendor</CardTitle>
            <CardDescription>Your application is approved.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <StepPill label="Vendor" status={vendorStatus} />
              <StepPill label="KYC" status={kycStatus} />
            </div>
            <div className="text-sm text-success">✅ Approved! You can access Vendor Panel now.</div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={refreshAccess} disabled={refreshing}>
                {refreshing ? "Refreshing..." : "Refresh Access"}
              </Button>
              <Link href={`${lp}/vendor`}>
                <Button>Go to Vendor Dashboard</Button>
              </Link>
              <Link href={`${lp}/vendor/kyc`} className="self-center text-sm underline">
                View KYC →
              </Link>
            </div>
            {msg ? <div className="text-sm text-muted-foreground">{msg}</div> : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-10">
      <Card>
        <CardHeader>
          <CardTitle>Become a Vendor</CardTitle>
          <CardDescription>Submit shop info + KYC. Admin approval required.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2">
            <StepPill label="Vendor" status={vendorStatus ?? "NOT_APPLIED"} />
            <StepPill label="KYC" status={kycStatus} />
          </div>

          {vendorStatus === "PENDING" ? (
            <div className="rounded-2xl border p-4 text-sm">
              <div className="text-amber-700">⏳ Your application is pending.</div>
              <div className="mt-2 flex gap-2">
                <Button variant="outline" onClick={refreshAccess} disabled={refreshing}>
                  {refreshing ? "Refreshing..." : "Refresh Access"}
                </Button>
                <Link href={`${lp}/vendor/kyc`} className="self-center text-sm underline">
                  View submitted KYC →
                </Link>
              </div>
              {app?.vendor?.statusReason ? (
                <div className="mt-2 text-danger">Reason: {app.vendor.statusReason}</div>
              ) : null}
              {app?.kyc?.rejectionReason ? (
                <div className="mt-1 text-danger">KYC Reason: {app.kyc.rejectionReason}</div>
              ) : null}
            </div>
          ) : null}

          {vendorStatus === "REJECTED" ? (
            <div className="rounded-2xl border p-4 text-sm">
              <div className="text-danger">❌ Your application was rejected. You can resubmit below.</div>
              {app?.vendor?.statusReason ? <div className="mt-1 text-danger">Reason: {app.vendor.statusReason}</div> : null}
              {app?.kyc?.rejectionReason ? <div className="mt-1 text-danger">KYC Reason: {app.kyc.rejectionReason}</div> : null}
            </div>
          ) : null}

          <div className="grid gap-6">
            <div>
              <div className="text-sm font-semibold">Shop Info</div>
              <div className="mt-3 grid gap-3">
                <div>
                  <label className="text-sm">Shop Name *</label>
                  <input className="mt-1 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm" value={form.shopName} onChange={(e) => setField("shopName", e.target.value)} />
                  {errors.shopName ? <div className="mt-1 text-xs text-danger">{errors.shopName}</div> : null}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-sm">Display Name</label>
                    <input className="mt-1 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm" value={form.displayName} onChange={(e) => setField("displayName", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm">Contact Email</label>
                    <input className="mt-1 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm" value={form.contactEmail} onChange={(e) => setField("contactEmail", e.target.value)} />
                    {errors.contactEmail ? <div className="mt-1 text-xs text-danger">{errors.contactEmail}</div> : null}
                  </div>
                </div>

                <div>
                  <label className="text-sm">Shop Description</label>
                  <textarea className="mt-1 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm" rows={3} value={form.shopDescription} onChange={(e) => setField("shopDescription", e.target.value)} />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-sm">Contact Phone</label>
                    <input className="mt-1 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm" value={form.contactPhone} onChange={(e) => setField("contactPhone", e.target.value)} />
                    {errors.contactPhone ? <div className="mt-1 text-xs text-danger">{errors.contactPhone}</div> : null}
                  </div>

                  <div>
                    <label className="text-sm">Brand Logo *</label>
                    <div className="mt-1 flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-(--radius) border bg-muted/20">
                        {form.logoUrl ? <img src={form.logoUrl} alt="Logo" className="h-12 w-12 object-contain" /> : null}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={busyKey === "logoUrl" || submitting}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadField(f, "logoUrl", "vendor_logo");
                        }}
                        className="block w-full text-sm"
                      />
                    </div>
                    {errors.logoUrl ? <div className="mt-1 text-xs text-danger">{errors.logoUrl}</div> : null}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-sm">Shop Address 1 *</label>
                    <input className="mt-1 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm" value={form.shopAddress1} onChange={(e) => setField("shopAddress1", e.target.value)} />
                    {errors.shopAddress1 ? <div className="mt-1 text-xs text-danger">{errors.shopAddress1}</div> : null}
                  </div>
                  <div>
                    <label className="text-sm">Shop Address 2</label>
                    <input className="mt-1 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm" value={form.shopAddress2} onChange={(e) => setField("shopAddress2", e.target.value)} />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="text-sm">City *</label>
                    <input className="mt-1 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm" value={form.shopCity} onChange={(e) => setField("shopCity", e.target.value)} />
                    {errors.shopCity ? <div className="mt-1 text-xs text-danger">{errors.shopCity}</div> : null}
                  </div>
                  <div>
                    <label className="text-sm">State *</label>
                    <input className="mt-1 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm" value={form.shopState} onChange={(e) => setField("shopState", e.target.value)} />
                    {errors.shopState ? <div className="mt-1 text-xs text-danger">{errors.shopState}</div> : null}
                  </div>
                  <div>
                    <label className="text-sm">Pincode *</label>
                    <input className="mt-1 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm" value={form.shopPincode} onChange={(e) => setField("shopPincode", e.target.value)} />
                    {errors.shopPincode ? <div className="mt-1 text-xs text-danger">{errors.shopPincode}</div> : null}
                  </div>
                </div>

                <div className="rounded-2xl border p-4">
                  <div className="text-sm font-semibold">Pickup Address (optional)</div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-sm">Pickup Name</label>
                      <input className="mt-1 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm" value={form.pickupName} onChange={(e) => setField("pickupName", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm">Pickup Phone</label>
                      <input className="mt-1 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm" value={form.pickupPhone} onChange={(e) => setField("pickupPhone", e.target.value)} />
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-sm">Pickup Address 1</label>
                      <input className="mt-1 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm" value={form.pickupAddress1} onChange={(e) => setField("pickupAddress1", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm">Pickup Address 2</label>
                      <input className="mt-1 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm" value={form.pickupAddress2} onChange={(e) => setField("pickupAddress2", e.target.value)} />
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="text-sm">City</label>
                      <input className="mt-1 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm" value={form.pickupCity} onChange={(e) => setField("pickupCity", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm">State</label>
                      <input className="mt-1 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm" value={form.pickupState} onChange={(e) => setField("pickupState", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm">Pincode</label>
                      <input className="mt-1 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm" value={form.pickupPincode} onChange={(e) => setField("pickupPincode", e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold">KYC Details</div>
              <div className="mt-3 grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-sm">KYC Type *</label>
                    <select className="mt-1 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm" value={form.kycType} onChange={(e) => setField("kycType", e.target.value)}>
                      <option value="INDIVIDUAL">Individual</option>
                      <option value="BUSINESS">Business</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm">{form.kycType === "INDIVIDUAL" ? "Full Name *" : "Business Name *"}</label>
                    <input
                      className="mt-1 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm"
                      value={form.kycType === "INDIVIDUAL" ? form.fullName : form.businessName}
                      onChange={(e) => setField(form.kycType === "INDIVIDUAL" ? "fullName" : "businessName", e.target.value)}
                    />
                    {errors.fullName ? <div className="mt-1 text-xs text-danger">{errors.fullName}</div> : null}
                    {errors.businessName ? <div className="mt-1 text-xs text-danger">{errors.businessName}</div> : null}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-sm">PAN Number *</label>
                    <input className="mt-1 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm" value={form.panNumber} onChange={(e) => setField("panNumber", e.target.value)} />
                    {errors.panNumber ? <div className="mt-1 text-xs text-danger">{errors.panNumber}</div> : null}
                  </div>
                  <div>
                    <label className="text-sm">GSTIN (optional)</label>
                    <input className="mt-1 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm" value={form.gstin} onChange={(e) => setField("gstin", e.target.value)} />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-sm">Aadhaar (last 4 digits, optional)</label>
                    <input className="mt-1 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm" value={form.aadhaarLast4} onChange={(e) => setField("aadhaarLast4", e.target.value)} />
                    {errors.aadhaarLast4 ? <div className="mt-1 text-xs text-danger">{errors.aadhaarLast4}</div> : null}
                  </div>
                  <div>
                    <label className="text-sm">UPI ID (optional)</label>
                    <input className="mt-1 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm" value={form.upiId} onChange={(e) => setField("upiId", e.target.value)} />
                  </div>
                </div>

                <div className="rounded-2xl border p-4">
                  <div className="text-sm font-semibold">Bank Details</div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-sm">Account Name *</label>
                      <input className="mt-1 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm" value={form.bankAccountName} onChange={(e) => setField("bankAccountName", e.target.value)} />
                      {errors.bankAccountName ? <div className="mt-1 text-xs text-danger">{errors.bankAccountName}</div> : null}
                    </div>
                    <div>
                      <label className="text-sm">Account Number *</label>
                      <input className="mt-1 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm" value={form.bankAccountNumber} onChange={(e) => setField("bankAccountNumber", e.target.value)} />
                      {errors.bankAccountNumber ? <div className="mt-1 text-xs text-danger">{errors.bankAccountNumber}</div> : null}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-sm">IFSC *</label>
                      <input className="mt-1 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm" value={form.ifsc} onChange={(e) => setField("ifsc", e.target.value)} />
                      {errors.ifsc ? <div className="mt-1 text-xs text-danger">{errors.ifsc}</div> : null}
                    </div>
                    <div>
                      <label className="text-sm">Bank Name *</label>
                      <input className="mt-1 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm" value={form.bankName} onChange={(e) => setField("bankName", e.target.value)} />
                      {errors.bankName ? <div className="mt-1 text-xs text-danger">{errors.bankName}</div> : null}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border p-4">
                  <div className="text-sm font-semibold">Documents</div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-sm">PAN Image *</label>
                      <input type="file" disabled={busyKey === "panImage" || submitting} onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadField(f, "panImage", "vendor_kyc"); }} className="mt-1 block w-full text-sm" />
                      {form.panImage ? <a className="mt-1 block text-xs underline" href={form.panImage} target="_blank" rel="noreferrer">Preview</a> : null}
                      {errors.panImage ? <div className="mt-1 text-xs text-danger">{errors.panImage}</div> : null}
                    </div>
                    <div>
                      <label className="text-sm">GST Certificate (optional)</label>
                      <input type="file" disabled={busyKey === "gstCertificate" || submitting} onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadField(f, "gstCertificate", "vendor_kyc"); }} className="mt-1 block w-full text-sm" />
                      {form.gstCertificate ? <a className="mt-1 block text-xs underline" href={form.gstCertificate} target="_blank" rel="noreferrer">Preview</a> : null}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-sm">Cancelled Cheque / Bank Proof *</label>
                      <input type="file" disabled={busyKey === "cancelledCheque" || submitting} onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadField(f, "cancelledCheque", "vendor_kyc"); }} className="mt-1 block w-full text-sm" />
                      {form.cancelledCheque ? <a className="mt-1 block text-xs underline" href={form.cancelledCheque} target="_blank" rel="noreferrer">Preview</a> : null}
                      {errors.cancelledCheque ? <div className="mt-1 text-xs text-danger">{errors.cancelledCheque}</div> : null}
                    </div>
                    <div>
                      <label className="text-sm">Address Proof *</label>
                      <input type="file" disabled={busyKey === "addressProof" || submitting} onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadField(f, "addressProof", "vendor_kyc"); }} className="mt-1 block w-full text-sm" />
                      {form.addressProof ? <a className="mt-1 block text-xs underline" href={form.addressProof} target="_blank" rel="noreferrer">Preview</a> : null}
                      {errors.addressProof ? <div className="mt-1 text-xs text-danger">{errors.addressProof}</div> : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              {loadingApp ? "Loading your application..." : ""}
            </div>
            <Button onClick={submit} disabled={submitting || busyKey !== null || !readyToSubmit}>
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          </div>

          {msg ? (
            <div className={msg.startsWith("✅") ? "text-sm text-success" : msg.startsWith("❌") ? "text-sm text-danger" : "text-sm text-muted-foreground"}>
              {msg}
            </div>
          ) : null}

          <div className="text-xs text-muted-foreground">
            Need help? You can always check your submitted status in <Link className="underline" href={`${lp}/vendor/kyc`}>Vendor → KYC</Link>.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
