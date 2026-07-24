import type { ReactNode } from "react";

/** Route group placeholder — do not re-export parent layout (that nested two sidebars). */
export default function VendorDashboardGroupLayout({ children }: { children: ReactNode }) {
  return children;
}
