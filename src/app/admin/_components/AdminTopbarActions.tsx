"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function AdminTopbarActions() {
  const router = useRouter();

  return (
    <>
      <Button size="sm" onClick={() => router.push("/admin/products/new")}>Add Product</Button>
      <Button size="sm" variant="outline" onClick={() => router.push("/admin/coupons")}>Create Coupon</Button>
      <Button size="sm" variant="outline" onClick={() => router.push("/admin/settings/site")}>Site Settings</Button>
      <Button size="sm" variant="outline" onClick={() => router.push("/admin#admin-theme")}>Admin Theme</Button>
    </>
  );
}
