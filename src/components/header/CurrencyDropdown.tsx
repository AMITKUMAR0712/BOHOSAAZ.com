"use client";

import { useState } from "react";
import { Select } from "@/components/ui/select";

export type Currency = "INR" | "USD";

export function CurrencyDropdown() {
  const [currency, setCurrency] = useState<Currency>(() => {
    try {
      const saved = localStorage.getItem("currency");
      if (saved === "INR" || saved === "USD") return saved;
    } catch {
      // ignore
    }
    return "INR";
  });

  function onChange(next: Currency) {
    setCurrency(next);
    try {
      localStorage.setItem("currency", next);
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Rs.</span>
      <div className="w-30">
        <Select
          aria-label="Currency"
          value={currency}
          onChange={(e) => onChange(e.target.value as Currency)}
          className="h-8 text-xs"
        >
          <option value="INR">Rupees</option>
          <option value="USD">USD</option>
        </Select>
      </div>
    </div>
  );
}
