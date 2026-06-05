import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2, Circle, Clock3, Download, Headphones, Home, MapPin, PackageCheck, ReceiptText, ShieldCheck, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Price } from "@/components/ui/price";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { cookies } from "next/headers";
import { getPriceInCurrency } from "@/lib/currency-utils";

export default async function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      payment: true,
      VendorOrder: {
        include: {
          vendor: { select: { shopName: true } },
          items: {
            include: {
              product: {
                include: {
                  images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
                  vendor: { select: { shopName: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      items: {
        include: {
          product: {
            include: {
              images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
              vendor: { select: { shopName: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-4 py-16">
        <Card className="w-full overflow-hidden border border-border/70 bg-card/90 text-center">
          <CardContent className="p-8 sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <ReceiptText className="h-7 w-7" />
            </div>
            <h1 className="mt-6 font-heading text-3xl font-semibold tracking-tight">Order not found</h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              We could not find an order for this link. Please check your account orders or contact support.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <ActionLink href="/">Back to store</ActionLink>
              <ActionLink href="/account/orders" variant="outline">My orders</ActionLink>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const currency = order.currency === "USD" ? "USD" : "INR";
  const cookieStore = await cookies();
  const displayCurrency = cookieStore.get("bohosaaz_currency")?.value === "USD" ? "USD" : "INR";
  const displayAmount = (value: number) => getPriceInCurrency(Number(value || 0), currency, displayCurrency);
  const placedAt = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(order.createdAt);
  const eta = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(order.createdAt.getTime() + 5 * 24 * 60 * 60 * 1000));
  const statusLabel = String(order.status).replaceAll("_", " ");
  const paymentLabel =
    order.paymentMethod === "RAZORPAY" ? "Razorpay" : order.paymentMethod === "COD" ? "Cash on delivery" : "Wallet";
  const paymentStatus = order.payment?.status ?? (order.paymentMethod === "COD" ? "COD PENDING" : "CONFIRMED");
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const discount = Number(order.couponDiscount || 0);
  const shippingAddress = [
    order.address1,
    order.address2,
    order.city,
    order.state,
    order.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const timeline = [
    {
      label: "Order confirmed",
      description: "Your payment/order details are saved securely.",
      active: true,
      icon: CheckCircle2,
    },
    {
      label: "Packed",
      description: "Seller will prepare and pack your products.",
      active: ["PACKED", "SHIPPED", "DELIVERED", "PAID", "PLACED", "COD_PENDING"].includes(String(order.status)),
      icon: PackageCheck,
    },
    {
      label: "Shipped",
      description: "Tracking details will appear once dispatched.",
      active: ["SHIPPED", "DELIVERED"].includes(String(order.status)),
      icon: Truck,
    },
    {
      label: "Delivered",
      description: `Estimated delivery by ${eta}.`,
      active: String(order.status) === "DELIVERED",
      icon: Home,
    },
  ];
  const groupedItems = order.VendorOrder.length
    ? order.VendorOrder.map((vo) => ({
        id: vo.id,
        title: vo.vendor.shopName,
        status: vo.status,
        subtotal: vo.subtotal,
        items: vo.items,
      }))
    : [
        {
          id: order.id,
          title: "Bohosaaz",
          status: order.status,
          subtotal: order.subtotal,
          items: order.items,
        },
      ];

  return (
    <main className="relative overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_top_left,rgba(146,64,14,0.22),transparent_34%),linear-gradient(180deg,rgba(255,247,237,0.82),transparent)]" />

      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-4xl border border-primary/15 bg-card/85 shadow-premium backdrop-blur-xl">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.25fr_0.75fr] lg:p-10">
            <div>
              <Badge variant="success" className="gap-2 px-3 py-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Order placed successfully
              </Badge>
              <h1 className="mt-5 max-w-3xl font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                Thank you for shopping with Bohosaaz.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                We have received your order and are preparing it with care. You will get updates as soon as the seller starts packing and shipping.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <InfoPill label="Order ID" value={`#${order.id.slice(-10).toUpperCase()}`} />
                <InfoPill label="Placed on" value={placedAt} />
                <InfoPill label="Estimated delivery" value={eta} />
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <ActionLink href="/account/orders" size="lg">View my orders</ActionLink>
                <ActionLink href="/" size="lg" variant="outline">Continue shopping</ActionLink>
              </div>
            </div>

            <Card className="border border-primary/15 bg-background/70 shadow-premium">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Amount paid</p>
                    <Price value={displayAmount(order.total)} currency={displayCurrency} className="mt-1 block text-4xl" />
                  </div>
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                </div>
                <div className="mt-6 grid gap-3 text-sm">
                  <SummaryRow label="Payment method" value={paymentLabel} />
                  <SummaryRow label="Payment status" value={paymentStatus.replaceAll("_", " ")} />
                  <SummaryRow label="Order status" value={statusLabel} />
                  <SummaryRow label="Items" value={`${itemCount} item${itemCount === 1 ? "" : "s"}`} />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="grid gap-6">
            <Card className="border border-border/70">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-heading text-2xl font-semibold">Delivery progress</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Live shipment stages for this order.</p>
                  </div>
                  <Badge variant={String(order.status) === "CANCELLED" ? "danger" : "success"}>
                    {statusLabel}
                  </Badge>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-4">
                  {timeline.map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <div key={step.label} className="relative rounded-2xl border border-border/70 bg-background/60 p-4">
                        {index < timeline.length - 1 ? (
                          <div className="absolute left-[calc(100%-0.5rem)] top-8 hidden h-px w-4 bg-border md:block" />
                        ) : null}
                        <div
                          className={
                            "flex h-11 w-11 items-center justify-center rounded-full " +
                            (step.active ? "bg-primary text-primary-foreground shadow-(--shadowBtn)" : "bg-muted text-muted-foreground")
                          }
                        >
                          {step.active ? <Icon className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                        </div>
                        <div className="mt-4 font-semibold">{step.label}</div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/70">
              <CardContent className="p-0">
                <div className="border-b border-border bg-muted/25 px-6 py-5">
                  <h2 className="font-heading text-2xl font-semibold">Items in this order</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Seller-wise item details, quantities, and item status.</p>
                </div>

                <div className="grid gap-5 p-5 sm:p-6">
                  {groupedItems.map((group) => (
                    <div key={group.id} className="rounded-3xl border border-border/70 bg-background/55 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Seller</div>
                          <div className="font-semibold">{group.title || "Bohosaaz seller"}</div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{String(group.status).replaceAll("_", " ")}</Badge>
                          <div className="mt-1 text-sm font-semibold">{formatMoney(displayCurrency, displayAmount(Number(group.subtotal || 0)))}</div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4">
                        {group.items.map((item) => {
                          const image = item.product.images?.[0]?.url;
                          const lineTotal = Number(item.price) * item.quantity;
                          const variant = [item.variantSize, item.variantColor].filter(Boolean).join(" / ");

                          return (
                            <div key={item.id} className="flex gap-4 rounded-2xl bg-card/75 p-3">
                              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
                                {image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={image} alt={item.product.title} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">No image</div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="truncate font-semibold">{item.product.title}</div>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                      Qty {item.quantity} • {formatMoney(displayCurrency, displayAmount(Number(item.price)))}
                                      {variant ? ` • ${variant}` : ""}
                                    </div>
                                    <Badge className="mt-2" variant="secondary">
                                      {String(item.status).replaceAll("_", " ")}
                                    </Badge>
                                  </div>
                                  <div className="text-right font-heading text-lg font-semibold">
                                    {formatMoney(displayCurrency, displayAmount(lineTotal))}
                                  </div>
                                </div>
                                {(item.trackingCourier || item.trackingNumber) ? (
                                  <div className="mt-3 rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                                    Tracking: {item.trackingCourier || "Courier"} • {item.trackingNumber || "Pending"}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="grid h-fit gap-6 lg:sticky lg:top-24">
            <Card className="border border-border/70">
              <CardContent className="p-6">
                <h2 className="font-heading text-xl font-semibold">Price details</h2>
                <div className="mt-5 grid gap-3 text-sm">
                  <SummaryRow label="Subtotal" value={formatMoney(displayCurrency, displayAmount(order.subtotal))} />
                  <SummaryRow label="Discount" value={discount > 0 ? `-${formatMoney(displayCurrency, displayAmount(discount))}` : formatMoney(displayCurrency, 0)} />
                  {order.couponCode ? <SummaryRow label="Coupon" value={order.couponCode} /> : null}
                  <div className="my-1 border-t border-border" />
                  <SummaryRow label="Total paid" value={formatMoney(displayCurrency, displayAmount(order.total))} strong />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/70">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-heading text-xl font-semibold">Delivery address</h2>
                    <p className="text-xs text-muted-foreground">We will use this for shipping updates.</p>
                  </div>
                </div>
                <div className="mt-5 rounded-2xl bg-muted/35 p-4 text-sm leading-6">
                  <div className="font-semibold">{order.fullName || "Customer"}</div>
                  <div className="text-muted-foreground">{order.phone || "Phone not available"}</div>
                  <div className="mt-2 text-foreground">{shippingAddress || "Address not available"}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-primary/15 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-background p-3 text-primary shadow-sm">
                    <Headphones className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-heading text-xl font-semibold">Need help?</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Save this order ID for support: <span className="font-semibold text-foreground">#{order.id}</span>
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3">
                  <ActionLink href="/contact-us" variant="outline" className="w-full justify-start">
                    <Headphones className="h-4 w-4" />
                    Contact support
                  </ActionLink>
                  <ActionLink href={`/api/export/user/orders/${order.id}/invoice.pdf`} variant="soft" className="w-full justify-start">
                    <Download className="h-4 w-4" />
                    Download invoice
                  </ActionLink>
                </div>
              </CardContent>
            </Card>

            <div className="rounded-3xl border border-border/70 bg-card/60 p-5 text-xs leading-5 text-muted-foreground">
              <div className="flex gap-2 font-semibold text-foreground">
                <Clock3 className="h-4 w-4 text-primary" />
                What happens next?
              </div>
              <p className="mt-2">
                The seller confirms stock, packs your order, and shares tracking once dispatched. You can monitor everything from My Orders.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-heading text-lg font-semibold text-foreground" : "font-semibold text-foreground"}>
        {value}
      </span>
    </div>
  );
}

function ActionLink({
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "outline" | "soft";
  size?: "md" | "lg";
  className?: string;
}) {
  const variantClass =
    variant === "outline"
      ? "border border-primary/35 bg-card/55 text-foreground shadow-sm backdrop-blur hover:border-primary/60 hover:bg-muted/45"
      : variant === "soft"
        ? "border border-border bg-secondary/80 text-secondary-foreground shadow-sm backdrop-blur hover:bg-muted/55"
        : "bg-primary text-primary-foreground shadow-(--shadowBtn) hover:brightness-95 hover:shadow-(--shadowBtnHover)";
  const sizeClass = size === "lg" ? "h-12 px-7 text-base" : "h-11 px-5";

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-(--radius) text-sm font-semibold tracking-[-0.01em] transition-all duration-200 hover:-translate-y-px active:translate-y-px ${variantClass} ${sizeClass} ${className}`}
    >
      {children}
    </Link>
  );
}
