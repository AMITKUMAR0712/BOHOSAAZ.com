"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isLocale } from "@/lib/i18n";

type VendorStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
type KycStatus = "NOT_SUBMITTED" | "SUBMITTED" | "VERIFIED" | "REJECTED";

type Application = {
  status: "NOT_APPLIED" | VendorStatus;
  vendor: null | {
    shopName: string;
    displayName: string | null;
    logoUrl: string | null;
    status: VendorStatus;
    statusReason: string | null;
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
    submittedAt: string | null;
    verifiedAt: string | null;
  };
};

function mask(s: string, keepLast = 4) {
  const t = String(s || "");
  if (t.length <= keepLast) return t;
  return `${"•".repeat(Math.max(0, t.length - keepLast))}${t.slice(-keepLast)}`;
}

export default function VendorKycPage() {
  const pathname = usePathname();
  const seg = pathname.split("/").filter(Boolean)[0];
  const lang = seg && isLocale(seg) ? seg : "en";
  const lp = `/${lang}`;

  const [data, setData] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const canResubmit = useMemo(() => {
    if (!data?.vendor) return true;
    if (data.vendor.status === "REJECTED") return true;
    if (data.kyc?.status === "REJECTED") return true;
    return false;
  }, [data]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr(null);
      const res = await fetch("/api/vendor/application", { credentials: "include" });
      const json: unknown = await res.json().catch(() => null);
      const ok =
        typeof json === "object" &&
        json !== null &&
        "ok" in json &&
        (json as { ok?: unknown }).ok === true;
      if (!mounted) return;
      if (!res.ok || !ok) {
        const errMsg =
          typeof json === "object" && json !== null && "error" in json
            ? String((json as { error?: unknown }).error || "Failed to load")
            : "Failed to load";
        setErr(errMsg);
        setData(null);
        setLoading(false);
        return;
      }
      setData((json as unknown) as Application);
      setLoading(false);
    })().catch((e) => {
      if (!mounted) return;
      setErr(e instanceof Error ? e.message : "Failed to load");
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>KYC</CardTitle>
          <CardDescription>View your submitted KYC details and document proofs.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <div className="h-4 w-48 rounded bg-muted animate-pulse" />
              <div className="h-4 w-64 rounded bg-muted animate-pulse" />
              <div className="h-4 w-56 rounded bg-muted animate-pulse" />
            </div>
          ) : err ? (
            <div className="text-sm text-danger">❌ {err}</div>
          ) : !data || data.status === "NOT_APPLIED" ? (
            <div className="text-sm">
              <div className="text-muted-foreground">No vendor application found.</div>
              <div className="mt-3">
                <Link className="underline" href={`${lp}/account/vendor-apply`}>
                  Apply to become a vendor →
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Vendor status</div>
                    <div className="text-lg font-semibold">{data.vendor?.status}</div>
                    {data.vendor?.statusReason ? (
                      <div className="mt-1 text-sm text-danger">Reason: {data.vendor.statusReason}</div>
                    ) : null}
                  </div>
                  {canResubmit ? (
                    <Link href={`${lp}/account/vendor-apply`}>
                      <Button variant="outline">Resubmit</Button>
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="text-sm text-muted-foreground">KYC status</div>
                <div className="text-lg font-semibold">{data.kyc?.status ?? "NOT_SUBMITTED"}</div>
                {data.kyc?.rejectionReason ? (
                  <div className="mt-1 text-sm text-danger">Reason: {data.kyc.rejectionReason}</div>
                ) : null}
                {data.kyc?.submittedAt ? (
                  <div className="mt-1 text-xs text-muted-foreground">Submitted: {new Date(data.kyc.submittedAt).toLocaleString()}</div>
                ) : null}
                {data.kyc?.verifiedAt ? (
                  <div className="mt-1 text-xs text-muted-foreground">Verified: {new Date(data.kyc.verifiedAt).toLocaleString()}</div>
                ) : null}
              </div>

              {data.kyc ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Identity</CardTitle>
                      <CardDescription>{data.kyc.kycType}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div><span className="text-muted-foreground">Name:</span> {data.kyc.kycType === "INDIVIDUAL" ? (data.kyc.fullName || "-") : (data.kyc.businessName || "-")}</div>
                      <div><span className="text-muted-foreground">PAN:</span> {mask(data.kyc.panNumber, 4)}</div>
                      <div><span className="text-muted-foreground">GSTIN:</span> {data.kyc.gstin ? mask(data.kyc.gstin, 4) : "-"}</div>
                      <div><span className="text-muted-foreground">Aadhaar (last 4):</span> {data.kyc.aadhaarLast4 || "-"}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Documents</CardTitle>
                      <CardDescription>Preview uploaded proofs</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2 text-sm">
                      <a className="underline" href={data.kyc.panImageUrl} target="_blank" rel="noreferrer">PAN Image</a>
                      {data.kyc.gstCertificateUrl ? (
                        <a className="underline" href={data.kyc.gstCertificateUrl} target="_blank" rel="noreferrer">GST Certificate</a>
                      ) : null}
                      <a className="underline" href={data.kyc.cancelledChequeUrl} target="_blank" rel="noreferrer">Cancelled Cheque / Bank Proof</a>
                      <a className="underline" href={data.kyc.addressProofUrl} target="_blank" rel="noreferrer">Address Proof</a>
                    </CardContent>
                  </Card>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
