import { redirect } from "next/navigation";

export default function VendorWalletRedirect() {
  redirect("/vendor/dashboard");
}
