"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function VendorTopbarActions() {
  const router = useRouter();

  return (
    <Button size="sm" onClick={() => router.push("/vendor/products/new")}>Add Product</Button>
  );
}
