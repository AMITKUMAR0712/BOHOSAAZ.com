export const SHOP_FILTERS_SETTING_KEY = "shopFilters";

export type ShopFilterKey =
  | "q"
  | "occasion"
  | "recipient"
  | "budget"
  | "sort"
  | "category"
  | "availability"
  | "color"
  | "size";

export type ShopFilterSection = "intent" | "refine";
export type ShopFilterType = "search" | "select" | "chips";
export type ShopFilterSource =
  | "manual"
  | "categories"
  | "tag:occasion"
  | "tag:recipient"
  | "tag:availability"
  | "product:colors"
  | "product:sizes";

export type ShopFilterOption = {
  value: string;
  label: string;
};

export type ShopFilterFieldConfig = {
  key: ShopFilterKey;
  enabled: boolean;
  label: string;
  placeholder: string;
  section: ShopFilterSection;
  type: ShopFilterType;
  source: ShopFilterSource;
  order: number;
  options?: ShopFilterOption[];
};

export type ShopFilterConfig = {
  fields: ShopFilterFieldConfig[];
};

export const DEFAULT_OCCASION_OPTIONS: ShopFilterOption[] = [
  { value: "birthday", label: "Birthday" },
  { value: "anniversary", label: "Anniversary" },
  { value: "wedding", label: "Wedding" },
  { value: "festival", label: "Festival" },
  { value: "diwali", label: "Diwali" },
  { value: "rakhi", label: "Rakhi" },
  { value: "housewarming", label: "Housewarming" },
  { value: "corporate", label: "Corporate Gifting" },
];

export const DEFAULT_RECIPIENT_OPTIONS: ShopFilterOption[] = [
  { value: "her", label: "For Her" },
  { value: "him", label: "For Him" },
  { value: "mother", label: "Mother" },
  { value: "father", label: "Father" },
  { value: "couple", label: "Couple" },
  { value: "friend", label: "Friend" },
  { value: "kids", label: "Kids" },
  { value: "colleague", label: "Colleague" },
];

export const SHOP_FILTER_FIELD_ORDER: ShopFilterKey[] = [
  "q",
  "occasion",
  "recipient",
  "budget",
  "sort",
  "category",
  "availability",
  "color",
  "size",
];

const fieldDefaults: Record<ShopFilterKey, ShopFilterFieldConfig> = {
  q: {
    key: "q",
    enabled: true,
    label: "Search",
    placeholder: "Search thoughtful gifts...",
    section: "intent",
    type: "search",
    source: "manual",
    order: 10,
  },
  occasion: {
    key: "occasion",
    enabled: true,
    label: "Occasion",
    placeholder: "Any occasion",
    section: "intent",
    type: "select",
    source: "tag:occasion",
    order: 20,
    options: DEFAULT_OCCASION_OPTIONS,
  },
  recipient: {
    key: "recipient",
    enabled: true,
    label: "Recipient",
    placeholder: "For anyone",
    section: "intent",
    type: "select",
    source: "tag:recipient",
    order: 30,
    options: DEFAULT_RECIPIENT_OPTIONS,
  },
  budget: {
    key: "budget",
    enabled: true,
    label: "Budget",
    placeholder: "Any budget",
    section: "intent",
    type: "select",
    source: "manual",
    order: 40,
    options: [
      { value: "0-999", label: "Under ₹999" },
      { value: "1000-1999", label: "₹1000 - ₹1999" },
      { value: "2000-4999", label: "₹2000 - ₹4999" },
      { value: "5000-", label: "₹5000+" },
    ],
  },
  sort: {
    key: "sort",
    enabled: true,
    label: "Sort",
    placeholder: "Latest",
    section: "intent",
    type: "select",
    source: "manual",
    order: 50,
    options: [
      { value: "latest", label: "Latest" },
      { value: "featured", label: "Featured" },
      { value: "best_selling", label: "Best Selling" },
      { value: "trending", label: "Trending" },
      { value: "new_arrivals", label: "New Arrivals" },
      { value: "price_asc", label: "Price: Low to High" },
      { value: "price_desc", label: "Price: High to Low" },
    ],
  },
  category: {
    key: "category",
    enabled: true,
    label: "Category",
    placeholder: "All categories",
    section: "refine",
    type: "select",
    source: "categories",
    order: 60,
  },
  availability: {
    key: "availability",
    enabled: true,
    label: "Availability",
    placeholder: "Any status",
    section: "refine",
    type: "select",
    source: "tag:availability",
    order: 70,
    options: [
      { value: "in_stock", label: "In Stock" },
      { value: "new_arrivals", label: "New Arrivals" },
      { value: "discounted", label: "Discounted" },
    ],
  },
  color: {
    key: "color",
    enabled: true,
    label: "Color",
    placeholder: "Any color",
    section: "refine",
    type: "chips",
    source: "product:colors",
    order: 80,
  },
  size: {
    key: "size",
    enabled: false,
    label: "Size",
    placeholder: "Any size",
    section: "refine",
    type: "select",
    source: "product:sizes",
    order: 90,
  },
};

export const DEFAULT_SHOP_FILTER_CONFIG: ShopFilterConfig = {
  fields: SHOP_FILTER_FIELD_ORDER.map((key) => ({ ...fieldDefaults[key], options: cloneOptions(fieldDefaults[key].options) })),
};

export function normalizeShopFilterConfig(value: unknown): ShopFilterConfig {
  const rawFields = value && typeof value === "object" && Array.isArray((value as { fields?: unknown }).fields)
    ? (value as { fields: unknown[] }).fields
    : [];

  const byKey = new Map<ShopFilterKey, unknown>();
  for (const item of rawFields) {
    if (!item || typeof item !== "object") continue;
    const key = (item as { key?: unknown }).key;
    if (isShopFilterKey(key) && !byKey.has(key)) byKey.set(key, item);
  }

  return {
    fields: SHOP_FILTER_FIELD_ORDER.map((key) => normalizeField(key, byKey.get(key))).sort((a, b) => a.order - b.order),
  };
}

export function enabledShopFilterFields(config: ShopFilterConfig) {
  return config.fields.filter((field) => field.enabled);
}

export function shopFilterFieldByKey(config: ShopFilterConfig, key: ShopFilterKey) {
  return config.fields.find((field) => field.key === key) ?? fieldDefaults[key];
}

export function isShopFilterKey(value: unknown): value is ShopFilterKey {
  return typeof value === "string" && SHOP_FILTER_FIELD_ORDER.includes(value as ShopFilterKey);
}

export function shopFilterOptionLabel(options: readonly ShopFilterOption[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value.replace(/[_-]+/g, " ");
}

function normalizeField(key: ShopFilterKey, value: unknown): ShopFilterFieldConfig {
  const fallback = fieldDefaults[key];
  if (!value || typeof value !== "object") {
    return { ...fallback, options: cloneOptions(fallback.options) };
  }

  const row = value as Partial<Record<keyof ShopFilterFieldConfig, unknown>>;
  return {
    key,
    enabled: typeof row.enabled === "boolean" ? row.enabled : fallback.enabled,
    label: cleanText(row.label, fallback.label),
    placeholder: cleanText(row.placeholder, fallback.placeholder),
    section: row.section === "intent" || row.section === "refine" ? row.section : fallback.section,
    type: fallback.type,
    source: fallback.source,
    order: cleanOrder(row.order, fallback.order),
    options: normalizeOptions(row.options, fallback.options),
  };
}

function normalizeOptions(value: unknown, fallback?: ShopFilterOption[]) {
  const fallbackOptions = cloneOptions(fallback);
  if (!Array.isArray(value)) return fallbackOptions;

  const seen = new Set<string>();
  const options: ShopFilterOption[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const valueText = cleanText((item as { value?: unknown }).value, "");
    const labelText = cleanText((item as { label?: unknown }).label, valueText);
    if (!valueText || seen.has(valueText)) continue;
    seen.add(valueText);
    options.push({ value: valueText, label: labelText });
  }

  return options.length ? options : fallbackOptions;
}

function cloneOptions(options?: ShopFilterOption[]) {
  return options?.map((option) => ({ ...option }));
}

function cleanText(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  return text ? text.slice(0, 120) : fallback;
}

function cleanOrder(value: unknown, fallback: number) {
  const order = typeof value === "number" ? value : Number(value);
  return Number.isFinite(order) ? Math.max(0, Math.min(999, Math.floor(order))) : fallback;
}
