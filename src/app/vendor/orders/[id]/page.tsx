import { redirect } from "next/navigation";

export default async function VendorOrderRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/en/vendor/orders/${id}`);
}
