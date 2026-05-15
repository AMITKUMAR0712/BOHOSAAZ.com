"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { useCurrency, type CurrencyType } from "@/lib/currency-context";
import { Globe } from "lucide-react";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from "@/components/ui/dropdown";

const CURRENCIES: { code: CurrencyType; label: string; symbol: string }[] = [
  { code: "INR", label: "Indian Rupee", symbol: "₹" },
  { code: "USD", label: "US Dollar", symbol: "$" },
];

function CurrencyOption({
  currency,
  label,
  symbol,
  active,
  onSelect,
}: {
  currency: CurrencyType;
  label: string;
  symbol: string;
  active: boolean;
  onSelect: (currency: CurrencyType) => void;
}) {
  return (
    <DropdownItem
      onSelect={() => {
        console.log("🔄 Currency option clicked:", currency);
        onSelect(currency);
      }}
      className={cn(
        "flex items-center gap-3",
        active ? "bg-primary text-primary-foreground" : "",
      )}
    >
      <span className="font-semibold text-lg">{symbol}</span>
      <div className="flex-1">
        <div className="font-medium text-sm">{currency}</div>
        <div className="text-xs opacity-70">{label}</div>
      </div>
    </DropdownItem>
  );
}

export default function CurrencySwitch({ className }: { className?: string } = {}) {
  const { currency, setCurrency, isLoading } = useCurrency();

  if (isLoading) {
    return (
      <button
        disabled
        className={cn(
          "h-9 px-3 rounded-lg flex items-center gap-2 bg-muted animate-pulse",
          className,
        )}
        aria-label="Loading currency selector"
      >
        <Globe className="w-4 h-4" />
      </button>
    );
  }

  const activeCurrency = CURRENCIES.find((c) => c.code === currency);

  return (
    <Dropdown>
      <DropdownTrigger
        className={cn(
          "h-9 px-3 text-sm font-medium",
          className,
        )}
      >
        <Globe className="w-4 h-4" />
        <span className="font-semibold">{currency}</span>
      </DropdownTrigger>
      <DropdownContent align="end" className="w-56">
        {CURRENCIES.map((c) => (
          <CurrencyOption
            key={c.code}
            currency={c.code}
            label={c.label}
            symbol={c.symbol}
            active={c.code === currency}
            onSelect={setCurrency}
          />
        ))}
      </DropdownContent>
    </Dropdown>
  );
}
