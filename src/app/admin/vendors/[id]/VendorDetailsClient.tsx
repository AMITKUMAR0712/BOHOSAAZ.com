"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/lib/toast";
import Link from "next/link";
import { ArrowLeft, Check, X, ExternalLink } from "lucide-react";

type Vendor = {
  id: string;
  shopName: string;
  displayName: string | null;
  shopDescription: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  status: string;
  statusReason: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  shopAddress1: string | null;
  shopAddress2: string | null;
  shopCity: string | null;
  shopState: string | null;
  shopPincode: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    createdAt: string;
  };
  kyc: {
    status: string;
    kycType: string;
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
  } | null;
  bankAccount: {
    accountName: string;
    accountNumber: string;
    ifsc: string;
    bankName: string;
    upiId: string | null;
  } | null;
};

export default function VendorDetailsClient({ initialVendor }: { initialVendor: Vendor }) {
  const router = useRouter();
  const [vendor, setVendor] = useState(initialVendor);
  const [loading, setLoading] = useState(false);

  async function updateStatus(action: "approve" | "reject") {
    let reason: string | null = null;
    if (action === "reject") {
      reason = window.prompt("Reason for rejection:");
      if (reason === null) return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/vendors/${vendor.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: action === "reject" ? JSON.stringify({ reason }) : undefined,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");

      toast.success(action === "approve" ? "Vendor approved successfully" : "Vendor rejected");
      
      // Refresh vendor data
      const refreshRes = await fetch(`/api/admin/vendors/${vendor.id}`);
      const refreshData = await refreshRes.json();
      if (refreshRes.ok) setVendor(refreshData.vendor);
      
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  const kyc = vendor.kyc;
  const bank = vendor.bankAccount;

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10">
      <div className="mb-6">
        <Link href="/admin/vendors" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Vendors
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{vendor.shopName}</h1>
          <p className="text-muted-foreground">Application ID: {vendor.id}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            vendor.status === "APPROVED" ? "bg-green-100 text-green-800" :
            vendor.status === "REJECTED" ? "bg-red-100 text-red-800" :
            "bg-yellow-100 text-yellow-800"
          }`}>
            {vendor.status}
          </span>
          {vendor.status === "PENDING" && (
            <>
              <Button variant="danger" size="sm" onClick={() => updateStatus("reject")} disabled={loading}>
                <X className="mr-2 h-4 w-4" /> Reject
              </Button>
              <Button variant="primary" size="sm" onClick={() => updateStatus("approve")} disabled={loading || !vendor.logoUrl}>
                <Check className="mr-2 h-4 w-4" /> Approve
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Vendor Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Shop Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">Shop Name</label>
                  <p className="font-semibold">{vendor.shopName}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">Display Name</label>
                  <p>{vendor.displayName || "-"}</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Description</label>
                <p className="text-sm">{vendor.shopDescription || "No description provided."}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">Logo</label>
                  <div className="mt-2 h-24 w-24 overflow-hidden rounded-lg border bg-muted/20">
                    {vendor.logoUrl ? (
                      <img src={vendor.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No Logo</div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">Banner</label>
                  <div className="mt-2 h-24 w-full overflow-hidden rounded-lg border bg-muted/20">
                    {vendor.bannerUrl ? (
                      <img src={vendor.bannerUrl} alt="Banner" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No Banner</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t">
                <label className="text-xs font-medium text-muted-foreground uppercase">Shop Address</label>
                <p className="text-sm mt-1">
                  {vendor.shopAddress1}<br />
                  {vendor.shopAddress2 && <>{vendor.shopAddress2}<br /></>}
                  {vendor.shopCity}, {vendor.shopState} - {vendor.shopPincode}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>KYC & Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!kyc ? (
                <p className="text-muted-foreground italic">No KYC details submitted.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase">KYC Type</label>
                      <p>{kyc.kycType}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase">Legal Name</label>
                      <p className="font-semibold">{kyc.fullName || kyc.businessName || "-"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase">PAN Number</label>
                      <p className="font-mono">{kyc.panNumber}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase">GSTIN</label>
                      <p>{kyc.gstin || "N/A"}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
                    <DocumentLink label="PAN Card" url={kyc.panImageUrl} />
                    <DocumentLink label="Address Proof" url={kyc.addressProofUrl} />
                    <DocumentLink label="Cancelled Cheque" url={kyc.cancelledChequeUrl} />
                    {kyc.gstCertificateUrl && <DocumentLink label="GST Certificate" url={kyc.gstCertificateUrl} />}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: User & Bank */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Full Name</label>
                <p>{vendor.user.name || "-"}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Email</label>
                <p>{vendor.user.email}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Phone</label>
                <p>{vendor.user.phone || "-"}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Joined On</label>
                <p>{new Date(vendor.user.createdAt).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bank Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!bank ? (
                <p className="text-muted-foreground italic">No bank details provided.</p>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase">Account Name</label>
                    <p>{bank.accountName}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase">Bank Name</label>
                    <p>{bank.bankName}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase">Account Number</label>
                    <p className="font-mono">{bank.accountNumber}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase">IFSC Code</label>
                    <p className="font-mono">{bank.ifsc}</p>
                  </div>
                  {bank.upiId && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase">UPI ID</label>
                      <p>{bank.upiId}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DocumentLink({ label, url }: { label: string; url: string }) {
  return (
    <div className="rounded-lg border p-3 flex items-center justify-between">
      <span className="text-sm font-medium">{label}</span>
      <a href={url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center text-xs">
        View <ExternalLink className="ml-1 h-3 w-3" />
      </a>
    </div>
  );
}
