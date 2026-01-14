import type { Locale } from "./i18n";

export type Dict = {
  brand: string;
  nav: { about: string; contact: string; terms: string; privacy: string };
  actions: { login: string; account: string; logout: string };
  home: { title: string; subtitle: string };
};

export const dict: Record<Locale, Dict> = {
  en: {
    brand: "Bohosaaz",
    nav: { about: "About", contact: "Contact", terms: "Terms", privacy: "Privacy" },
    actions: { login: "Login", account: "My Account", logout: "Logout" },
    home: { title: "Bohosaaz Store", subtitle: "Multi-vendor marketplace • Browse products" },
  },
  hi: {
    brand: "Bohosaaz",
    nav: { about: "हमारे बारे में", contact: "संपर्क", terms: "नियम", privacy: "गोपनीयता" },
    actions: { login: "लॉगिन", account: "मेरा अकाउंट", logout: "लॉगआउट" },
    home: { title: "Bohosaaz स्टोर", subtitle: "मल्टी-वेंडर मार्केटप्लेस • प्रोडक्ट्स ब्राउज़ करें" },
  },
};
