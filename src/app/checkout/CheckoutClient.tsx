"use client";

import Link from "next/link";
import Script from "next/script";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { Price } from "@/components/ui/price";
import { formatMoney } from "@/lib/money";
import { useCurrency } from "@/lib/currency-context";
import { getPriceInCurrency } from "@/lib/currency-utils";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type CartItem = { product?: { currency?: string | null; forceCodOnly?: boolean | null } | null };
type SavedAddress = {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  pincode: string;
  kind: string;
  isDefault: boolean;
};

export default function CheckoutClient({ langPrefix }: { langPrefix?: string }) {
  const lp = langPrefix || "";
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [orderCurrency, setOrderCurrency] = useState<"INR" | "USD">("INR");
  const [itemsData, setItemsData] = useState<CartItem[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"COD" | "RAZORPAY">("RAZORPAY");
  const { currency: selectedCurrency } = useCurrency();
  const displayCurrency = selectedCurrency;
  const displayAmount = (value: number) => getPriceInCurrency(Number(value || 0), orderCurrency, displayCurrency);
  const hasCodOnlyProducts = useMemo(
    () => itemsData.some((item) => item?.product?.forceCodOnly === true),
    [itemsData],
  );
  const codAvailable = useMemo(
    () => orderCurrency === "INR" && itemsData.length > 0 && itemsData.every((item) => item?.product?.forceCodOnly === true),
    [itemsData, orderCurrency],
  );
  const paymentMethod = selectedPaymentMethod;

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");

  function validateShipping(): string | null {
    if (fullName.trim().length < 2) return "Enter your full name";
    if (phone.trim().length < 8) return "Enter a valid phone number";
    if (address1.trim().length < 5) return "Enter your address";
    if (city.trim().length < 2) return "Enter your city";
    if (state.trim().length < 2) return "Enter your state";
    if (pincode.trim().length < 4) return "Enter a valid pincode";
    return null;
  }

  const backToCartHref = useMemo(() => `${lp}/cart` || "/cart", [lp]);
  const homeHref = useMemo(() => lp || "/", [lp]);

  const loadCart = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/cart", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data?.error || "Failed to load cart");
      setSubtotal(0);
      setTotal(0);
      setOrderCurrency("INR");
      setItemsData([]);
      setLoading(false);
      return;
    }
    const order = data.order;
    if (!order || !order.items?.length) {
      setMsg("Cart is empty");
      setSubtotal(0);
      setTotal(0);
      setOrderCurrency("INR");
      setItemsData([]);
    } else {
      const inferredCurrency = order.currency === "USD" ? "USD" : "INR";
      const nextItems = Array.isArray(order.items) ? order.items : [];

      // Store items data for payment method detection
      setItemsData(nextItems);
      if (inferredCurrency !== "INR" || !nextItems.length || !nextItems.every((item: CartItem) => item?.product?.forceCodOnly === true)) {
        setSelectedPaymentMethod("RAZORPAY");
      }

      setOrderCurrency(inferredCurrency);
      setSubtotal(Number(order.subtotal ?? order.total ?? 0));
      setTotal(Number(order.total || 0));
      setMsg(null);
    }
    setLoading(false);
  }, []);

  const applyAddress = useCallback((address: SavedAddress) => {
    setSelectedAddressId(address.id);
    setFullName(address.fullName);
    setPhone(address.phone);
    setAddress1(address.address1);
    setAddress2(address.address2 || "");
    setCity(address.city);
    setState(address.state);
    setPincode(address.pincode);
  }, []);

  const loadAddresses = useCallback(async () => {
    const res = await fetch("/api/addresses", { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    const rows = Array.isArray(data?.addresses) ? (data.addresses as SavedAddress[]) : [];
    setAddresses(rows);
    const preferred = rows.find((row) => row.isDefault) ?? rows[0];
    if (preferred) applyAddress(preferred);
  }, [applyAddress]);

  useEffect(() => {
    void loadCart();
    void loadAddresses();
  }, [loadCart, loadAddresses]);

  async function placeCOD() {
    setMsg(null);
    setPlacing(true);
    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: "COD",
          fullName,
          phone,
          address1,
          address2,
          city,
          state,
          pincode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Checkout failed");

      toast({
        variant: "success",
        title: "Order placed",
        message: `COD order created • Total ${formatMoney(displayCurrency, displayAmount(Number(data.total || 0)))}`,
      });
      router.push(`${lp}/order/${data.orderId}` || `/order/${data.orderId}`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Checkout failed";
      toast({ variant: "danger", title: "Checkout failed", message });
      setMsg(message);
    } finally {
      setPlacing(false);
    }
  }

  async function payWithRazorpay() {
    setMsg(null);

    const shippingError = validateShipping();
    if (shippingError) {
      toast({ variant: "danger", title: "Checkout", message: shippingError });
      setMsg(shippingError);
      return;
    }

    setPlacing(true);
    try {
      const payload: Record<string, unknown> = {
        paymentMethod: "RAZORPAY",
        fullName,
        phone,
        address1,
        address2,
        city,
        state,
        pincode,
      };
      payload.currency = orderCurrency;

      const res = await fetch("/api/checkout/create", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const fieldErrors = (data?.fieldErrors as Record<string, unknown> | undefined) ?? undefined;
        const firstFieldError = (() => {
          if (!fieldErrors || typeof fieldErrors !== "object") return null;
          for (const v of Object.values(fieldErrors)) {
            if (Array.isArray(v) && typeof v[0] === "string") return v[0];
          }
          return null;
        })();

        throw new Error(
          firstFieldError ||
            (typeof data?.error === "string" ? (data.error as string) : "Failed to start Razorpay checkout")
        );
      }

      if (!window.Razorpay) throw new Error("Razorpay checkout script not loaded");

      const razorpayOrderId = typeof data.razorpayOrderId === "string" ? data.razorpayOrderId : null;
      const keyId = typeof data.keyId === "string" ? data.keyId : null;
      const amountPaise = typeof data.amountPaise === "string" ? data.amountPaise : null;
      const currencyFromServer = typeof data.currency === "string" ? data.currency : "INR";
      const orderId = typeof data.orderId === "string" ? data.orderId : null;

      if (!razorpayOrderId || !keyId || !amountPaise || !orderId) {
        throw new Error("Invalid Razorpay checkout payload");
      }

      const options: Record<string, unknown> = {
        key: keyId,
        amount: amountPaise,
        currency: currencyFromServer,
        name: "Bohosaaz",
        description: "Order payment",
        order_id: razorpayOrderId,
        notes: { orderId },
        handler: async (response: unknown) => {
          const r = response && typeof response === "object" ? (response as Record<string, unknown>) : null;
          const rOrderId = typeof r?.razorpay_order_id === "string" ? r.razorpay_order_id : null;
          const rPaymentId = typeof r?.razorpay_payment_id === "string" ? r.razorpay_payment_id : null;
          const rSignature = typeof r?.razorpay_signature === "string" ? r.razorpay_signature : null;

          if (!rOrderId || !rPaymentId || !rSignature) {
            setMsg("Payment response missing required fields");
            setPlacing(false);
            return;
          }

          const verifyRes = await fetch("/api/checkout/verify", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentMethod: "RAZORPAY",
              orderId,
              razorpayOrderId: rOrderId,
              razorpayPaymentId: rPaymentId,
              razorpaySignature: rSignature,
            }),
          });

          const verifyData = await verifyRes.json().catch(() => ({}));
          if (!verifyRes.ok) {
            const err = (verifyData?.error as string) || "Payment verification failed";
            setMsg(err);
            toast({ variant: "danger", title: "Payment failed", message: err });
            setPlacing(false);
            return;
          }

          toast({ variant: "success", title: "Payment successful", message: "Order marked as PAID" });
          router.push(`${lp}/order/${orderId}` || `/order/${orderId}`);
          setPlacing(false);
        },
        modal: {
          ondismiss: () => {
            const message = "Payment cancelled. Your order was not placed.";
            setMsg(message);
            setPlacing(false);
            toast({ variant: "warning", title: "Payment cancelled", message });
          },
        },
      };

      const rz = new window.Razorpay(options);
      rz.open();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Payment failed";
      toast({ variant: "danger", title: "Payment failed", message });
      setMsg(message);
    } finally {
      // Razorpay success/cancel callbacks clear the placing state after the modal closes.
    }
  }

  return (
    <div className="site-container mobile-bottom-safe py-5 md:py-10">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <div className="rounded-[24px] border border-border/70 bg-card/65 p-4 shadow-[0_18px_60px_rgba(47,38,34,0.06)] backdrop-blur-xl md:rounded-[34px] md:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground">Checkout</div>
          <h1 className="mt-2 font-heading text-3xl md:text-4xl tracking-tight text-foreground">Secure checkout</h1>
          <p className="mt-2 text-sm text-muted-foreground">Online payment is the default. COD appears only for admin-enabled COD products.</p>
        </div>
        <Link className="text-sm text-muted-foreground hover:text-foreground transition" href={backToCartHref}>
          ← Back to cart
        </Link>
      </div>
      </div>

      {msg ? (
        <div className="mt-4 rounded-(--radius) border border-border bg-card p-3 text-sm text-muted-foreground">{msg}</div>
      ) : null}

      {loading ? (
        <div className="mt-6 grid gap-4">
          <Skeleton className="h-14" />
          <Skeleton className="h-64" />
        </div>
      ) : total <= 0 ? (
        <Card className="mt-6 overflow-hidden bg-card/85 shadow-premium">
          <div className="p-8">
            <div className="font-heading text-2xl">Cart is empty</div>
            <div className="mt-2 text-sm text-muted-foreground">Add items before checking out.</div>
            <div className="mt-5">
              <Link href={homeHref}>
                <Button>Go shopping</Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-5 lg:mt-8 lg:grid-cols-3 lg:gap-6">
          <div className="lg:col-span-2">
            <Card className="overflow-hidden bg-card/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <div className="border-b border-border bg-muted/25 px-5 py-4">
                <div className="font-heading text-lg text-foreground">Shipping address</div>
                <div className="mt-1 text-sm text-muted-foreground">We’ll use this for delivery updates.</div>
              </div>

              <div className="p-4 sm:p-5">
                {addresses.length ? (
                  <div className="mb-5 rounded-2xl border border-border bg-muted/20 p-3">
                    <div className="text-sm font-semibold text-foreground">Saved addresses</div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {addresses.map((address) => (
                        <button
                          key={address.id}
                          type="button"
                          className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${
                            selectedAddressId === address.id ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card/70 hover:bg-muted/35"
                          }`}
                          onClick={() => applyAddress(address)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold">{address.label || address.fullName}</span>
                            <span className="rounded-full bg-background/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                              {address.isDefault ? "Default" : address.kind || "Secondary"}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {address.address1}, {address.city}, {address.state} - {address.pincode}
                          </div>
                        </button>
                      ))}
                    </div>
                    <Link href={`${lp}/account/profile`} className="mt-3 inline-block text-xs font-semibold text-primary underline underline-offset-4">
                      Manage addresses
                    </Link>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>

                <div className="mt-3 grid gap-3">
                  <Input placeholder="Address line 1" value={address1} onChange={(e) => setAddress1(e.target.value)} />
                  <Input placeholder="Address line 2 (optional)" value={address2} onChange={(e) => setAddress2(e.target.value)} />
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
                  <Input placeholder="State" value={state} onChange={(e) => setState(e.target.value)} />
                  <Input placeholder="Pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} />
                </div>

                <div className="mt-6 rounded-(--radius) border border-border bg-muted/25 p-4 text-sm text-muted-foreground">
                  Please ensure your phone number is reachable for delivery updates.
                </div>
              </div>
            </Card>
          </div>

          <div className="h-fit lg:sticky lg:top-24">
            <Card className="overflow-hidden bg-card/90 shadow-premium">
              <div className="border-b border-border bg-muted/25 px-5 py-4">
                <div className="font-heading text-lg text-foreground">Order summary</div>
                <div className="mt-1 text-sm text-muted-foreground">Choose payment method</div>
              </div>

              <div className="p-4 sm:p-5">
                <div className="mb-4 rounded-2xl border border-border bg-card p-3 text-sm text-foreground">
                  <div className="mb-3 font-medium">Payment options</div>
                  {hasCodOnlyProducts && !codAvailable ? (
                    <div className="mb-3 rounded-lg border border-yellow-200/50 bg-yellow-50/50 p-2 text-xs text-yellow-900">
                      COD is enabled only when every item in the cart is admin-approved for COD and the order currency is INR.
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <label className="flex min-h-14 items-center gap-3 rounded-(--radius) border border-border px-3 py-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="RAZORPAY"
                        checked={selectedPaymentMethod === "RAZORPAY"}
                        onChange={() => setSelectedPaymentMethod("RAZORPAY")}
                      />
                      <span>Pay with Razorpay</span>
                    </label>
                    {codAvailable ? (
                      <label className="flex min-h-14 items-center gap-3 rounded-(--radius) border border-border px-3 py-3">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="COD"
                          checked={selectedPaymentMethod === "COD"}
                          onChange={() => setSelectedPaymentMethod("COD")}
                        />
                        <span>Cash on Delivery</span>
                      </label>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">Subtotal</div>
                  <Price value={displayAmount(subtotal)} currency={displayCurrency} size="sm" className="text-foreground" />
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Total</div>
                  <Price value={displayAmount(total)} currency={displayCurrency} size="lg" />
                </div>

                <Button
                  disabled={placing}
                  onClick={paymentMethod === "COD" ? placeCOD : payWithRazorpay}
                  className="mt-5 h-12 w-full uppercase tracking-[0.12em]"
                  variant="primary"
                >
                  {placing ? "PROCESSING..." : paymentMethod === "COD" ? "PLACE ORDER (COD)" : "PAY WITH RAZORPAY"}
                </Button>

                <div className="mt-4 text-xs text-muted-foreground">
                  Stock is validated at checkout to prevent overselling.
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
