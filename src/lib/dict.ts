import type { Locale } from "./i18n";

export type Dict = {
  brand: string;
  nav: { about: string; contact: string; terms: string; privacy: string };
  actions: { login: string; account: string; logout: string };
  home: { title: string; subtitle: string };
};

export const dict: Record<Locale, Dict> = {
  en: {
    brand: "BohoSaaz",
    nav: { about: "About", contact: "Contact", terms: "Terms", privacy: "Privacy" },
    actions: { login: "Login", account: "My Account", logout: "Logout" },
    home: { title: "BohoSaazStore", subtitle: "Art of meaningful gifting" },
  },
  hi: {
    brand: "BohoSaaz",
    nav: { about: "हमारे बारे में", contact: "संपर्क", terms: "नियम", privacy: "गोपनीयता" },
    actions: { login: "लॉगिन", account: "मेरा अकाउंट", logout: "लॉगआउट" },
    home: { title: "BohoSaazस्टोर", subtitle: "Art of meaningful gifting" },
  },
};
