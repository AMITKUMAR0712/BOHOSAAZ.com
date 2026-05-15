import Link from "next/link";

export default async function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;

  return (
    <div className="p-10">
      <h1 className="text-2xl font-semibold">Order placed ✅</h1>
      <p className="mt-2 text-sm text-gray-600">Order ID: {orderId}</p>
      <Link className="underline text-sm mt-4 block" href="/">← Back to store</Link>
    </div>
  );
}
