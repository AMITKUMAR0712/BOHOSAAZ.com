export const locales = ["en", "hi"] as const;
export type Locale = (typeof locales)[number];

export function isLocale(x: string): x is Locale {
  return locales.includes(x as Locale);
}
