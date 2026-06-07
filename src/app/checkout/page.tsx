import CheckoutClient from "./CheckoutClient";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams?: Promise<{ orderId?: string | string[] }>;
}) {
  const sp = (await searchParams) ?? {};
  const orderId = typeof sp.orderId === "string" ? sp.orderId : null;
  return <CheckoutClient orderId={orderId} />;
}
