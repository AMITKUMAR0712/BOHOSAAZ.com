"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type CurrencyType = "INR" | "USD";

interface CurrencyContextType {
  currency: CurrencyType;
  setCurrency: (currency: CurrencyType) => void;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const LS_KEY = "bohosaaz_currency";
const COOKIE_KEY = "bohosaaz_currency";

function getCurrencyFromStorage(): CurrencyType {
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored === "INR" || stored === "USD") return stored;
  } catch {
    // ignore
  }
  return "INR";
}

function setCurrencyPersistence(currency: CurrencyType, userId?: string) {
  try {
    localStorage.setItem(LS_KEY, currency);
  } catch {
    // ignore
  }

  try {
    const maxAge = 60 * 60 * 24 * 365; // 1 year
    document.cookie = `${COOKIE_KEY}=${encodeURIComponent(currency)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  } catch {
    // ignore
  }

  // Save to database if user is logged in
  if (userId) {
    fetch("/api/user/currency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currency }),
    }).catch(() => {
      // Silent failure for DB sync
    });
  }
}

export function CurrencyProvider({ children, userId }: { children: React.ReactNode; userId?: string }) {
  const [currency, setCurrencyState] = useState<CurrencyType>("INR");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initCurrency = async () => {
      let initialCurrency: CurrencyType = "INR";

      // Try localStorage first (works for everyone)
      initialCurrency = getCurrencyFromStorage();

      // If user is logged in, fetch from DB to override localStorage
      if (userId) {
        try {
          const response = await fetch("/api/user/currency");
          if (response.ok) {
            const data = await response.json();
            if (data.currency === "INR" || data.currency === "USD") {
              initialCurrency = data.currency;
            }
          }
        } catch {
          // Keep localStorage value if DB fetch fails
        }
      }

      setCurrencyState(initialCurrency);
      setIsLoading(false);
    };

    initCurrency();
  }, [userId]);

  const handleSetCurrency = (newCurrency: CurrencyType) => {
    console.log("🔁 setCurrency called:", newCurrency);
    setCurrencyState(newCurrency);
    try {
      setCurrencyPersistence(newCurrency, userId);
    } catch (e) {
      console.error("Failed to persist currency", e);
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency: handleSetCurrency, isLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return context;
}
