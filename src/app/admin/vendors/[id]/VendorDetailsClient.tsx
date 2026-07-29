"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import Link from "next/link";
import { ArrowLeft, Check, Pencil, X, ExternalLink } from "lucide-react";
import { isLocale } from "@/lib/i18n";

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
  pickupName: string | null;
  pickupPhone: string | null;
  pickupAddress1: string | null;
  pickupAddress2: string | null;
  pickupCity: string | null;
  pickupState: string | null;
  pickupPincode: string | null;
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

type FormState = Record<string, string>;

function vendorToForm(vendor: Vendor): FormState {
  const k = vendor.kyc;
  const b = vendor.bankAccount;
  return {
    shopName: vendor.shopName || "",
    displayName: vendor.displayName || "",
    shopDescription: vendor.shopDescription || "",
    contactEmail: vendor.contactEmail || "",
    contactPhone: vendor.contactPhone || "",
    shopAddress1: vendor.shopAddress1 || "",
    shopAddress2: vendor.shopAddress2 || "",
    shopCity: vendor.shopCity || "",
    shopState: vendor.shopState || "",
    shopPincode: vendor.shopPincode || "",
    pickupName: vendor.pickupName || "",
    pickupPhone: vendor.pickupPhone || "",
    pickupAddress1: vendor.pickupAddress1 || "",
    pickupAddress2: vendor.pickupAddress2 || "",
    pickupCity: vendor.pickupCity || "",
    pickupState: vendor.pickupState || "",
    pickupPincode: vendor.pickupPincode || "",
    logoUrl: vendor.logoUrl || "",
    bannerUrl: vendor.bannerUrl || "",
    kycType: k?.kycType || "INDIVIDUAL",
    fullName: k?.fullName || "",
    businessName: k?.businessName || "",
    panNumber: k?.panNumber || "",
    gstin: k?.gstin || "",
    aadhaarLast4: k?.aadhaarLast4 || "",
    panImage: k?.panImageUrl || "",
    gstCertificate: k?.gstCertificateUrl || "",
    cancelledCheque: k?.cancelledChequeUrl || "",
    addressProof: k?.addressProofUrl || "",
    bankAccountName: b?.accountName || "",
    bankAccountNumber: b?.accountNumber || "",
    ifsc: b?.ifsc || "",
    bankName: b?.bankName || "",
    upiId: b?.upiId || "",
  };
}

function Field({
  label,
  value,
  onChange,
  editing,
  display,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  editing: boolean;
  display?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium uppercase text-muted-foreground">{label}</label>
      {editing ? (
        <Input className="mt-1" value={value} onChange={(e) => onChange?.(e.target.value)} />
      ) : (
        <p className="mt-1">{display ?? (value || "-")}</p>
      )}
    </div>
  );
}

export default function VendorDetailsClient({ initialVendor }: { initialVendor: Vendor }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const seg = pathname.split("/").filter(Boolean)[0];
  const lang = seg && isLocale(seg) ? seg : "en";

  const [vendor, setVendor] = useState(initialVendor);
  const [editing, setEditing] = useState(searchParams.get("edit") === "1");
  const [form, setForm] = useState<FormState>(() => vendorToForm(initialVendor));
  const [loading, setLoading] = useState(false);

  const kyc = vendor.kyc;
  const bank = vendor.bankAccount;

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function refreshVendor() {
    const refreshRes = await fetch(`/api/admin/vendors/${vendor.id}`);
    const refreshData = await refreshRes.json().catch(() => null);
    if (refreshRes.ok && refreshData?.vendor) {
      setVendor(refreshData.vendor);
      setForm(vendorToForm(refreshData.vendor));
    }
  }

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

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Action failed");

      toast.success(action === "approve" ? "Vendor approved successfully" : "Vendor rejected");
      await refreshVendor();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setLoading(false);
    }
  }

  async function deleteVendor() {
    if (!window.confirm(`Delete vendor "${vendor.shopName}"? This cannot be undone.`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/vendors/${vendor.id}/delete`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Delete failed");
      toast.success("Vendor deleted");
      router.push(`/${lang}/admin/vendors`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setLoading(false);
    }
  }

  async function saveEdit() {
    setLoading(true);
    try {
      const payload = {
        shop: {
          shopName: form.shopName.trim(),
          displayName: form.displayName.trim() || null,
          shopDescription: form.shopDescription.trim() || null,
          contactEmail: form.contactEmail.trim() || null,
          contactPhone: form.contactPhone.trim() || null,
          shopAddress: {
            address1: form.shopAddress1.trim(),
            address2: form.shopAddress2.trim() || null,
            city: form.shopCity.trim(),
            state: form.shopState.trim(),
            pincode: form.shopPincode.trim(),
          },
          pickupAddress: form.pickupAddress1.trim()
            ? {
                name: form.pickupName.trim() || null,
                phone: form.pickupPhone.trim() || null,
                address1: form.pickupAddress1.trim(),
                address2: form.pickupAddress2.trim() || null,
                city: form.pickupCity.trim() || null,
                state: form.pickupState.trim() || null,
                pincode: form.pickupPincode.trim() || null,
              }
            : null,
          logoUrl: form.logoUrl.trim(),
          bannerUrl: form.bannerUrl.trim() || null,
        },
        kyc: {
          kycType: form.kycType === "BUSINESS" ? "BUSINESS" : "INDIVIDUAL",
          fullName: form.fullName.trim() || null,
          businessName: form.businessName.trim() || null,
          panNumber: form.panNumber.trim(),
          gstin: form.gstin.trim() || null,
          aadhaarLast4: form.aadhaarLast4.trim() || null,
          bankAccountName: form.bankAccountName.trim(),
          bankAccountNumber: form.bankAccountNumber.trim(),
          ifsc: form.ifsc.trim(),
          bankName: form.bankName.trim(),
          upiId: form.upiId.trim() || null,
          documents: {
            panImage: form.panImage.trim(),
            gstCertificate: form.gstCertificate.trim() || null,
            cancelledCheque: form.cancelledCheque.trim(),
            addressProof: form.addressProof.trim(),
          },
        },
      };

      const res = await fetch(`/api/admin/vendors/${vendor.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Save failed");
      }

      toast.success("Vendor updated (status unchanged)");
      if (data.data?.vendor) {
        setVendor(data.data.vendor);
        setForm(vendorToForm(data.data.vendor));
      } else {
        await refreshVendor();
      }
      setEditing(false);
      router.replace(`/${lang}/admin/vendors/${vendor.id}`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  const statusClass = useMemo(() => {
    if (vendor.status === "APPROVED") return "bg-green-100 text-green-800";
    if (vendor.status === "REJECTED") return "bg-red-100 text-red-800";
    return "bg-yellow-100 text-yellow-800";
  }, [vendor.status]);

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10">
      <div className="mb-6">
        <Link
          href={`/${lang}/admin/vendors`}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Vendors
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{vendor.shopName}</h1>
          <p className="text-muted-foreground">Application ID: {vendor.id}</p>
          {editing ? (
            <CardDescription className="mt-1">
              Admin edit — changes save directly (no re-approval).
            </CardDescription>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}`}>
            {vendor.status}
          </span>

          {!editing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setForm(vendorToForm(vendor));
                setEditing(true);
              }}
              disabled={loading}
            >
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setForm(vendorToForm(vendor));
                  setEditing(false);
                  router.replace(`/${lang}/admin/vendors/${vendor.id}`);
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={() => void saveEdit()} disabled={loading}>
                Save changes
              </Button>
            </>
          )}

          {vendor.status === "PENDING" && !editing ? (
            <>
              <Button variant="danger" size="sm" onClick={() => updateStatus("reject")} disabled={loading}>
                <X className="mr-2 h-4 w-4" /> Reject
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => updateStatus("approve")}
                disabled={loading || !vendor.logoUrl}
              >
                <Check className="mr-2 h-4 w-4" /> Approve
              </Button>
            </>
          ) : null}

          {!editing ? (
            <Button variant="outline" size="sm" onClick={deleteVendor} disabled={loading}>
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Shop Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Shop Name" value={form.shopName} editing={editing} onChange={(v) => setField("shopName", v)} />
                <Field label="Display Name" value={form.displayName} editing={editing} onChange={(v) => setField("displayName", v)} />
              </div>
              <Field
                label="Description"
                value={form.shopDescription}
                editing={editing}
                onChange={(v) => setField("shopDescription", v)}
                display={vendor.shopDescription || "No description provided."}
              />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Contact Email" value={form.contactEmail} editing={editing} onChange={(v) => setField("contactEmail", v)} />
                <Field label="Contact Phone" value={form.contactPhone} editing={editing} onChange={(v) => setField("contactPhone", v)} />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Logo URL" value={form.logoUrl} editing={editing} onChange={(v) => setField("logoUrl", v)} display={vendor.logoUrl || "No Logo"} />
                <Field label="Banner URL" value={form.bannerUrl} editing={editing} onChange={(v) => setField("bannerUrl", v)} display={vendor.bannerUrl || "No Banner"} />
              </div>
              {!editing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-24 w-24 overflow-hidden rounded-lg border bg-muted/20">
                    {vendor.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={vendor.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No Logo</div>
                    )}
                  </div>
                  <div className="h-24 w-full overflow-hidden rounded-lg border bg-muted/20">
                    {vendor.bannerUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={vendor.bannerUrl} alt="Banner" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No Banner</div>
                    )}
                  </div>
                </div>
              ) : null}
              <div className="border-t pt-4">
                <div className="text-xs font-medium uppercase text-muted-foreground">Shop Address</div>
                <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Address 1" value={form.shopAddress1} editing={editing} onChange={(v) => setField("shopAddress1", v)} />
                  <Field label="Address 2" value={form.shopAddress2} editing={editing} onChange={(v) => setField("shopAddress2", v)} />
                  <Field label="City" value={form.shopCity} editing={editing} onChange={(v) => setField("shopCity", v)} />
                  <Field label="State" value={form.shopState} editing={editing} onChange={(v) => setField("shopState", v)} />
                  <Field label="Pincode" value={form.shopPincode} editing={editing} onChange={(v) => setField("shopPincode", v)} />
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="text-xs font-medium uppercase text-muted-foreground">Pickup Address</div>
                <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Pickup Name" value={form.pickupName} editing={editing} onChange={(v) => setField("pickupName", v)} />
                  <Field label="Pickup Phone" value={form.pickupPhone} editing={editing} onChange={(v) => setField("pickupPhone", v)} />
                  <Field label="Address 1" value={form.pickupAddress1} editing={editing} onChange={(v) => setField("pickupAddress1", v)} />
                  <Field label="Address 2" value={form.pickupAddress2} editing={editing} onChange={(v) => setField("pickupAddress2", v)} />
                  <Field label="City" value={form.pickupCity} editing={editing} onChange={(v) => setField("pickupCity", v)} />
                  <Field label="State" value={form.pickupState} editing={editing} onChange={(v) => setField("pickupState", v)} />
                  <Field label="Pincode" value={form.pickupPincode} editing={editing} onChange={(v) => setField("pickupPincode", v)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>KYC & Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!kyc && !editing ? (
                <p className="italic text-muted-foreground">No KYC details submitted.</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {editing ? (
                      <div>
                        <label className="text-xs font-medium uppercase text-muted-foreground">KYC Type</label>
                        <select
                          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                          value={form.kycType}
                          onChange={(e) => setField("kycType", e.target.value)}
                        >
                          <option value="INDIVIDUAL">INDIVIDUAL</option>
                          <option value="BUSINESS">BUSINESS</option>
                        </select>
                      </div>
                    ) : (
                      <Field label="KYC Type" value={kyc?.kycType || ""} editing={false} />
                    )}
                    {form.kycType === "BUSINESS" || (!editing && kyc?.kycType === "BUSINESS") ? (
                      <Field label="Business Name" value={form.businessName} editing={editing} onChange={(v) => setField("businessName", v)} />
                    ) : (
                      <Field label="Full Name" value={form.fullName} editing={editing} onChange={(v) => setField("fullName", v)} />
                    )}
                    <Field label="PAN Number" value={form.panNumber} editing={editing} onChange={(v) => setField("panNumber", v)} />
                    <Field label="GSTIN" value={form.gstin} editing={editing} onChange={(v) => setField("gstin", v)} display={kyc?.gstin || "N/A"} />
                    <Field label="Aadhaar last 4" value={form.aadhaarLast4} editing={editing} onChange={(v) => setField("aadhaarLast4", v)} />
                  </div>
                  <div className="grid gap-4 border-t pt-4 md:grid-cols-2">
                    {editing ? (
                      <>
                        <Field label="PAN Image URL" value={form.panImage} editing onChange={(v) => setField("panImage", v)} />
                        <Field label="Address Proof URL" value={form.addressProof} editing onChange={(v) => setField("addressProof", v)} />
                        <Field label="Cancelled Cheque URL" value={form.cancelledCheque} editing onChange={(v) => setField("cancelledCheque", v)} />
                        <Field label="GST Certificate URL" value={form.gstCertificate} editing onChange={(v) => setField("gstCertificate", v)} />
                      </>
                    ) : kyc ? (
                      <>
                        <DocumentLink label="PAN Card" url={kyc.panImageUrl} />
                        <DocumentLink label="Address Proof" url={kyc.addressProofUrl} />
                        <DocumentLink label="Cancelled Cheque" url={kyc.cancelledChequeUrl} />
                        {kyc.gstCertificateUrl ? <DocumentLink label="GST Certificate" url={kyc.gstCertificateUrl} /> : null}
                      </>
                    ) : null}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Full Name" value={vendor.user.name || ""} editing={false} />
              <Field label="Email" value={vendor.user.email} editing={false} />
              <Field label="Phone" value={vendor.user.phone || ""} editing={false} />
              <Field label="Joined On" value={new Date(vendor.user.createdAt).toLocaleDateString()} editing={false} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bank Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!bank && !editing ? (
                <p className="italic text-muted-foreground">No bank details provided.</p>
              ) : (
                <>
                  <Field label="Account Name" value={form.bankAccountName} editing={editing} onChange={(v) => setField("bankAccountName", v)} />
                  <Field label="Bank Name" value={form.bankName} editing={editing} onChange={(v) => setField("bankName", v)} />
                  <Field label="Account Number" value={form.bankAccountNumber} editing={editing} onChange={(v) => setField("bankAccountNumber", v)} />
                  <Field label="IFSC Code" value={form.ifsc} editing={editing} onChange={(v) => setField("ifsc", v)} />
                  <Field label="UPI ID" value={form.upiId} editing={editing} onChange={(v) => setField("upiId", v)} />
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
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm font-medium">{label}</span>
      <a href={url} target="_blank" rel="noreferrer" className="flex items-center text-xs text-primary hover:underline">
        View <ExternalLink className="ml-1 h-3 w-3" />
      </a>
    </div>
  );
}
