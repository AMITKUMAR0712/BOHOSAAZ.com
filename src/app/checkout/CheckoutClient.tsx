"use client";

import Link from "next/link";
import Script from "next/script";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { Price } from "@/components/ui/price";
import { formatMoney } from "@/lib/money";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export default function CheckoutClient({ langPrefix }: { langPrefix?: string }) {
  const lp = langPrefix || "";
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState<string>("");
  const [couponBusy, setCouponBusy] = useState(false);

  const autoAppliedRef = useRef(false);

  const [paymentMethod, setPaymentMethod] = useState<"RAZORPAY" | "COD">("RAZORPAY");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

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
      setDiscount(0);
      setTotal(0);
      setCouponCode(null);
      setCouponInput("");
      setLoading(false);
      return;
    }
    const order = data.order;
    if (!order || !order.items?.length) {
      setMsg("Cart is empty");
      setSubtotal(0);
      setDiscount(0);
      setTotal(0);
      setCurrency("INR");
      setCouponCode(null);
      setCouponInput("");
    } else {
      const inferredCurrency = (() => {
        const items: any[] = Array.isArray(order.items) ? order.items : [];
        const currencies = new Set<string>();
        for (const it of items) {
          const c = it?.product?.currency;
          if (c === "USD" || c === "INR") currencies.add(c);
        }
        if (currencies.size === 1) return Array.from(currencies)[0] as "INR" | "USD";
        if (currencies.size === 0) return "INR" as const;
        return "MIXED" as const;
      })();

      if (inferredCurrency === "MIXED") {
        setMsg("Cart has mixed currencies. Please checkout INR and USD items separately.");
      }

      setCurrency(inferredCurrency === "MIXED" ? "INR" : inferredCurrency);
      setSubtotal(Number(order.subtotal ?? order.total ?? 0));
      setDiscount(Number(order.couponDiscount ?? 0));
      setTotal(Number(order.total || 0));
      setCouponCode((order.couponCode as string | null) ?? null);
      setCouponInput(String(order.couponCode || ""));
      if (inferredCurrency !== "MIXED") setMsg(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadCart();
  }, [loadCart]);

  const applyCoupon = useCallback(
    async (code: string) => {
      setMsg(null);
      setCouponBusy(true);
      try {
        const res = await fetch("/api/checkout/apply-coupon", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const error = data?.error || "Coupon could not be applied";
          setMsg(error);
          toast({ variant: "danger", title: "Coupon", message: error });
          return;
        }
        toast({ variant: "success", title: "Coupon", message: data?.code ? `Applied ${data.code}` : "Removed" });
        await loadCart();
      } finally {
        setCouponBusy(false);
      }
    },
    [loadCart, toast],
  );

  useEffect(() => {
    if (loading) return;
    if (autoAppliedRef.current) return;
    if (couponCode) return;

    const key = "bohosaaz_preferred_coupon_code";
    const preferred = (() => {
      try {
        const v = localStorage.getItem(key);
        return v ? v.trim().toUpperCase() : "";
      } catch {
        return "";
      }
    })();

    if (!preferred) return;
    autoAppliedRef.current = true;

    void (async () => {
      try {
        await applyCoupon(preferred);
      } finally {
        try {
          localStorage.removeItem(key);
        } catch {
          // ignore
        }
      }
    })();
  }, [applyCoupon, couponCode, loading]);

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
        message: `COD order created • Total ${formatMoney(currency, Number(data.total || 0))}`,
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
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: "RAZORPAY",
          currency,
          fullName,
          phone,
          address1,
          address2,
          city,
          state,
          pincode,
        }),
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
            return;
          }

          toast({ variant: "success", title: "Payment successful", message: "Order marked as PAID" });
          router.push(`${lp}/order/${orderId}` || `/order/${orderId}`);
        },
      };

      const rz = new window.Razorpay(options);
      rz.open();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Payment failed";
      toast({ variant: "danger", title: "Payment failed", message });
      setMsg(message);
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground">Checkout</div>
          <h1 className="mt-2 font-heading text-3xl md:text-4xl tracking-tight text-foreground">Secure checkout</h1>
          <p className="mt-2 text-sm text-muted-foreground">Choose Razorpay or Cash on Delivery and complete your order.</p>
        </div>
        <Link className="text-sm text-muted-foreground hover:text-foreground transition" href={backToCartHref}>
          ← Back to cart
        </Link>
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
        <Card className="mt-6 overflow-hidden">
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
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <div className="border-b border-border bg-muted/25 px-5 py-4">
                <div className="font-heading text-lg text-foreground">Shipping address</div>
                <div className="mt-1 text-sm text-muted-foreground">We’ll use this for delivery updates.</div>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>

                <div className="mt-3 grid gap-3">
                  <Input placeholder="Address line 1" value={address1} onChange={(e) => setAddress1(e.target.value)} />
                  <Input placeholder="Address line 2 (optional)" value={address2} onChange={(e) => setAddress2(e.target.value)} />
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
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

          <div className="lg:sticky lg:top-24 h-fit">
            <Card className="overflow-hidden shadow-premium">
              <div className="border-b border-border bg-muted/25 px-5 py-4">
                <div className="font-heading text-lg text-foreground">Order summary</div>
                <div className="mt-1 text-sm text-muted-foreground">Choose payment method</div>
              </div>

              <div className="p-5">
                <div className="grid gap-2">
                  <div className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground">Payment</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("RAZORPAY")}
                      className={`h-11 rounded-2xl border px-4 text-sm transition ${
                        paymentMethod === "RAZORPAY"
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-card hover:bg-muted/25 text-muted-foreground"
                      }`}
                    >
                      Razorpay
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("COD")}
                      className={`h-11 rounded-2xl border px-4 text-sm transition ${
                        paymentMethod === "COD"
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-card hover:bg-muted/25 text-muted-foreground"
                      }`}
                    >
                      COD
                    </button>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground">Coupon</div>
                  <div className="flex gap-2">
                    <Input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Enter coupon code"
                      disabled={couponBusy}
                    />
                    <Button
                      variant="outline"
                      className="h-11"
                      disabled={couponBusy}
                      onClick={() => applyCoupon(couponInput)}
                    >
                      Apply
                    </Button>
                  </div>
                  {couponCode ? (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Applied: {couponCode}</span>
                      <button
                        className="underline underline-offset-4 hover:text-foreground transition"
                        disabled={couponBusy}
                        onClick={() => applyCoupon("")}
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 h-px bg-border" />

                <div className="flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">Subtotal</div>
                  <Price value={subtotal} currency={currency} size="sm" className="text-foreground" />
                </div>
                {discount > 0 ? (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <div className="text-muted-foreground">Discount</div>
                    <Price value={-discount} currency={currency} size="sm" className="text-foreground" />
                  </div>
                ) : null}

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Total</div>
                  <Price value={total} currency={currency} size="lg" />
                </div>

                <Button
                  disabled={placing}
                  onClick={paymentMethod === "COD" ? placeCOD : payWithRazorpay}
                  className="mt-5 w-full h-11 uppercase tracking-[0.12em]"
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
