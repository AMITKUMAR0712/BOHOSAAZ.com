import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import { Prisma, PrismaClient } from "@prisma/client";

loadEnvFile(".env");
loadEnvFile(".env.local");

const prisma = new PrismaClient();

const RAMHARI_API_BASE = "https://ram-b-2qwe.onrender.com/api";
const VENDOR_EMAIL = "ramhari.vendor@bohosaaz.test";
const VENDOR_PASSWORD = "Vendor@12345";
const VENDOR_NAME = "Bohosaaz";
const PRODUCT_SEO_SUFFIX = "gift-noida-greater-noida-delhi-ncr";
const CATEGORY_SEO_SUFFIX = "gifts-noida-delhi-ncr";
const BRAND_SEO_SUFFIX = "gift-products-noida-delhi-ncr";

type RamhariCategory = {
  id: number;
  name: string;
  slug: string;
  image?: string | null;
};

type RamhariProduct = {
  id: number;
  name: string;
  slug?: string | null;
  description?: string | null;
  price: number;
  discount?: number | null;
  stock?: number | null;
  sku?: string | null;
  weight?: number | null;
  dimensions?: string | null;
  material?: string | null;
  isActive?: boolean;
  isFeatured?: boolean;
  category?: RamhariCategory | null;
  images?: Array<{ id: number; url: string; alt?: string | null; isPrimary?: boolean }>;
};

function loadEnvFile(fileName: string) {
  const file = resolve(process.cwd(), fileName);
  if (!existsSync(file)) return;

  const content = readFileSync(file, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (!key || process.env[key] != null) continue;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function seoSlug(input: string, suffixText = PRODUCT_SEO_SUFFIX) {
  const cleaned = input
    .replace(/\b(gift|gifts|gift-products|online-gifts)\b/gi, " ")
    .replace(/\b(noida|greater-noida|greater noida|new-delhi|new delhi|delhi-ncr|delhi ncr|ncr)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const suffix = slugify(suffixText);
  const base = slugify(cleaned).slice(0, Math.max(20, 150 - suffix.length - 1)).replace(/-+$/g, "");
  return `${base}-${suffix}`.replace(/-+$/g, "");
}

function stripHtml(input: string | null | undefined) {
  return (input ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function limitText(input: string, max: number) {
  if (input.length <= max) return input;
  return `${input.slice(0, Math.max(0, max - 3)).trimEnd()}...`;
}

function applyBohosaazBranding(input: string) {
  return input
    .replace(/\bRamhari[-\s]+Enterprises\b/gi, "Bohosaaz")
    .replace(/\bRamhari\s+Enterprises\b/gi, "Bohosaaz")
    .replace(/\bRamharienterprises\b/gi, "Bohosaaz")
    .replace(/\bRamhari\b/gi, "Bohosaaz");
}

function salePrice(price: number, discount: number | null | undefined) {
  const pct = Number(discount ?? 0);
  if (!Number.isFinite(pct) || pct <= 0) return null;
  return Math.max(1, +(Number(price) * (1 - pct / 100)).toFixed(2));
}

function parseDimensions(raw: string | null | undefined) {
  if (!raw) return { length: null, width: null, height: null };
  const matches = raw.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (matches.length < 3) return { length: null, width: null, height: null };
  return { length: matches[0] ?? null, width: matches[1] ?? null, height: matches[2] ?? null };
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${RAMHARI_API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Ramhari API ${path} failed: ${res.status} ${res.statusText}`);

  const json = (await res.json()) as { success?: boolean; data?: T };
  if (json.success === false || json.data == null) throw new Error(`Ramhari API ${path} returned invalid data`);
  return json.data;
}

async function ensureVendor() {
  const password = await bcrypt.hash(VENDOR_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: VENDOR_EMAIL },
    update: {
      name: "Bohosaaz",
      phone: "9718223075",
      role: "VENDOR",
    },
    create: {
      name: "Bohosaaz",
      email: VENDOR_EMAIL,
      phone: "9718223075",
      password,
      role: "VENDOR",
    },
  });

  const vendor = await prisma.vendor.upsert({
    where: { userId: user.id },
    update: {
      shopName: VENDOR_NAME,
      displayName: "Bohosaaz",
      shopDescription: "Bohosaaz curated collection for barware, hospitality, copperware and gifting products.",
      logoUrl: "/s1.jpg",
      bannerUrl: "/s6.jpg",
      status: "APPROVED",
      statusReason: null,
      commission: 10,
      contactEmail: "sales@bohosaaz.com",
      contactPhone: "9718223075",
      shopAddress1: "Mock Industrial Market",
      shopAddress2: "Sector 15",
      shopCity: "Faridabad",
      shopState: "Haryana",
      shopPincode: "121007",
      pickupName: "Bohosaaz Dispatch",
      pickupPhone: "9718223075",
      pickupAddress1: "Mock Warehouse Road",
      pickupAddress2: "Near Trade Centre",
      pickupCity: "Faridabad",
      pickupState: "Haryana",
      pickupPincode: "121007",
    },
    create: {
      userId: user.id,
      shopName: VENDOR_NAME,
      displayName: "Bohosaaz",
      shopDescription: "Bohosaaz curated collection for barware, hospitality, copperware and gifting products.",
      logoUrl: "/s1.jpg",
      bannerUrl: "/s6.jpg",
      status: "APPROVED",
      commission: 10,
      contactEmail: "sales@bohosaaz.com",
      contactPhone: "9718223075",
      shopAddress1: "Mock Industrial Market",
      shopAddress2: "Sector 15",
      shopCity: "Faridabad",
      shopState: "Haryana",
      shopPincode: "121007",
      pickupName: "Bohosaaz Dispatch",
      pickupPhone: "9718223075",
      pickupAddress1: "Mock Warehouse Road",
      pickupAddress2: "Near Trade Centre",
      pickupCity: "Faridabad",
      pickupState: "Haryana",
      pickupPincode: "121007",
    },
  });

  await prisma.vendorKyc.upsert({
    where: { vendorId: vendor.id },
    update: {
      status: "VERIFIED",
      kycType: "BUSINESS",
      fullName: "Bohosaaz",
      businessName: "Bohosaaz",
      gstin: "06ABCDE1234F1Z5",
      rejectionReason: null,
      verifiedAt: new Date(),
    },
    create: {
      vendorId: vendor.id,
      status: "VERIFIED",
      kycType: "BUSINESS",
      fullName: "Bohosaaz",
      businessName: "Bohosaaz",
      panNumber: "ABCDE1234F",
      gstin: "06ABCDE1234F1Z5",
      aadhaarLast4: null,
      panImageUrl: "/s1.jpg",
      gstCertificateUrl: "/s2.jpg",
      cancelledChequeUrl: "/s3.jpg",
      addressProofUrl: "/s4.jpg",
      submittedAt: new Date(),
      verifiedAt: new Date(),
    },
  });

  await prisma.vendorBankAccount.upsert({
    where: { vendorId: vendor.id },
    update: {
      accountName: "Bohosaaz",
      accountNumber: "000123456789",
      ifsc: "HDFC0001234",
      bankName: "HDFC Bank",
      upiId: "bohosaaz@upi",
    },
    create: {
      vendorId: vendor.id,
      accountName: "Bohosaaz",
      accountNumber: "000123456789",
      ifsc: "HDFC0001234",
      bankName: "HDFC Bank",
      upiId: "bohosaaz@upi",
    },
  });

  await prisma.walletAccount.upsert({
    where: { vendorId: vendor.id },
    update: {},
    create: {
      kind: "VENDOR",
      vendorId: vendor.id,
      balancePaise: BigInt(0),
    },
  });

  return vendor;
}

async function ensureBrands() {
  const existingPopular = await prisma.brand.findFirst({
    where: {
      brandType: "POPULAR",
      OR: [
        { slug: { in: ["bohosaaz", "ramharienterprises", seoSlug("Bohosaaz popular", BRAND_SEO_SUFFIX)] } },
        { name: VENDOR_NAME },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  const popular = existingPopular
    ? await prisma.brand.update({
        where: { id: existingPopular.id },
        data: {
          name: VENDOR_NAME,
          slug: seoSlug("Bohosaaz popular", BRAND_SEO_SUFFIX),
          logoUrl: "/s1.jpg",
          brandType: "POPULAR",
          isActive: true,
          sortOrder: 0,
        },
      })
    : await prisma.brand.create({
        data: {
          name: VENDOR_NAME,
          slug: seoSlug("Bohosaaz popular", BRAND_SEO_SUFFIX),
          logoUrl: "/s1.jpg",
          brandType: "POPULAR",
          isActive: true,
          sortOrder: 0,
        },
      });

  const existingLuxury = await prisma.brand.findFirst({
    where: {
      brandType: "LUXURY",
      OR: [
        { slug: { in: ["bohosaaz-luxury", "ramharienterprises-luxury", seoSlug("Bohosaaz luxury", BRAND_SEO_SUFFIX)] } },
        { name: VENDOR_NAME },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  if (existingLuxury) {
    await prisma.brand.update({
      where: { id: existingLuxury.id },
      data: {
        name: VENDOR_NAME,
        slug: seoSlug("Bohosaaz luxury", BRAND_SEO_SUFFIX),
        logoUrl: "/s1.jpg",
        brandType: "LUXURY",
        isActive: true,
        sortOrder: 0,
      },
    });
  } else {
    await prisma.brand.create({
      data: {
        name: VENDOR_NAME,
        slug: seoSlug("Bohosaaz luxury", BRAND_SEO_SUFFIX),
        logoUrl: "/s1.jpg",
        brandType: "LUXURY",
        isActive: true,
        sortOrder: 0,
      },
    });
  }

  await prisma.brand.deleteMany({
    where: {
      slug: { in: ["ramharienterprises", "ramharienterprises-luxury"] },
      id: { not: popular.id },
      products: { none: {} },
    },
  });

  return popular;
}

async function ensureCategories(categories: RamhariCategory[]) {
  const rows = new Map<string, { id: string; name: string; slug: string }>();

  for (let i = 0; i < categories.length; i++) {
    const category = categories[i]!;
    const seoCategorySlug = seoSlug(category.name, CATEGORY_SEO_SUFFIX);
    const existing = await prisma.category.findFirst({
      where: { OR: [{ slug: { in: [category.slug, seoCategorySlug] } }, { name: category.name }] },
      select: { id: true },
    });
    const row = existing
      ? await prisma.category.update({
          where: { id: existing.id },
          data: {
            name: category.name,
            slug: seoCategorySlug,
            iconName: "ShoppingBag",
            isHidden: false,
          },
          select: { id: true, name: true, slug: true },
        })
      : await prisma.category.create({
          data: {
            name: category.name,
            slug: seoCategorySlug,
            position: 100 + i,
            iconName: "ShoppingBag",
          },
          select: { id: true, name: true, slug: true },
        });
    rows.set(category.slug, row);
    rows.set(row.slug, row);
  }

  return rows;
}

async function ensureTags(productId: string, names: string[]) {
  const uniqueNames = Array.from(new Set(names.map((name) => name.trim()).filter(Boolean)));
  for (const name of uniqueNames) {
    const slug = slugify(name);
    if (!slug) continue;

    const tag = await prisma.tag.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });

    await prisma.productTag.upsert({
      where: { productId_tagId: { productId, tagId: tag.id } },
      update: {},
      create: { productId, tagId: tag.id },
    });
  }
}

async function syncProduct(
  product: RamhariProduct,
  vendorId: string,
  brandId: string,
  categories: Map<string, { id: string; name: string; slug: string }>,
) {
  const categorySlug = product.category?.slug ?? "hotel-and-hospitality";
  const category = categories.get(categorySlug) ?? categories.values().next().value;
  if (!category) throw new Error(`No category available for ${product.name}`);

  const sourceTitle = product.name.trim();
  const brandedTitle = applyBohosaazBranding(sourceTitle);
  const title = limitText(brandedTitle, 180);
  const legacyBaseSlug = slugify(product.slug || title);
  const baseSlug = seoSlug(`${title} ${category.name} ${VENDOR_NAME}`);
  const slug = baseSlug.startsWith("bohosaaz") ? baseSlug : `bohosaaz-${baseSlug}`;
  const legacySlugs = [`ramhari-${legacyBaseSlug}`, `bohosaaz-${legacyBaseSlug}`, `bohosaaz-${baseSlug}`];
  const price = Number(product.price);
  const discounted = salePrice(price, product.discount);
  const images = (product.images ?? [])
    .filter((image) => image.url)
    .sort((a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)) || a.id - b.id);
  const { length, width, height } = parseDimensions(product.dimensions);
  const description = [brandedTitle, applyBohosaazBranding(stripHtml(product.description))]
    .filter(Boolean)
    .join("\n\n");
  const material = product.material?.trim() ? limitText(product.material.trim(), 180) : null;
  const sku = product.sku?.trim() ? limitText(applyBohosaazBranding(product.sku.trim()), 180) : `BOHOSAAZ-${product.id}`;
  const shortDescription = limitText(`${category.name} by Bohosaaz`, 180);
  const metaTitle = limitText(`${title} | Bohosaaz`, 180);
  const metaDescription = limitText(`Shop ${brandedTitle} from Bohosaaz.`, 180);
  const metaKeywords = limitText(
    ["bohosaaz", category.name, material].filter(Boolean).join(", "),
    180,
  );

  const data = {
    vendorId,
    categoryId: category.id,
    brandId,
    title,
    slug,
    description,
    shortDescription,
    currency: "INR" as const,
    mrp: discounted ? price : null,
    price,
    salePrice: discounted,
    sku,
    stock: Number(product.stock ?? 0),
    status: "PUBLISHED" as const,
    isActive: product.isActive !== false,
    isFeatured: Boolean(product.isFeatured || product.id >= 17),
    isTrending: [1, 2, 7, 10, 12, 20, 21].includes(product.id),
    material,
    weight: product.weight == null ? null : Number(product.weight),
    length,
    width,
    height,
    dimensions: product.dimensions ? { raw: product.dimensions } : Prisma.DbNull,
    shippingClass: "standard",
    countryOfOrigin: "India",
    warranty: "7 days replacement.",
    returnPolicy: "7-day returns. Item must be unused with original packaging.",
    metaTitle,
    metaDescription,
    metaKeywords,
  };

  const existing = await prisma.product.findFirst({
    where: { OR: [{ slug: { in: [slug, ...legacySlugs] } }, { sku }] },
    select: { id: true },
  });

  const row = existing
    ? await prisma.product.update({
        where: { id: existing.id },
        data,
        select: { id: true },
      })
    : await prisma.product.create({
        data,
        select: { id: true },
      });

  await prisma.productImage.deleteMany({ where: { productId: row.id } });
  if (images.length) {
    await prisma.productImage.createMany({
      data: images.map((image, index) => ({
        productId: row.id,
        url: image.url,
        isPrimary: index === 0,
      })),
    });
  }

  await prisma.productTag.deleteMany({ where: { productId: row.id } });
  await ensureTags(row.id, ["Bohosaaz", category.name, material ?? ""]);
}

async function main() {
  console.log("Fetching Ramhari catalog...");
  const [remoteCategories, remoteProducts] = await Promise.all([
    fetchJson<RamhariCategory[]>("/categories"),
    fetchJson<RamhariProduct[]>("/products?limit=500"),
  ]);

  const activeProducts = remoteProducts.filter((product) => product.isActive !== false);
  const vendor = await ensureVendor();
  const brand = await ensureBrands();
  const categories = await ensureCategories(remoteCategories);

  for (const product of activeProducts) {
    await syncProduct(product, vendor.id, brand.id, categories);
  }

  console.log(`Imported ${activeProducts.length} products with Bohosaaz display branding.`);
  console.log(`Vendor: ${VENDOR_NAME} (${VENDOR_EMAIL} / ${VENDOR_PASSWORD})`);
  console.log("Brands: Bohosaaz in POPULAR and LUXURY.");
}

main()
  .catch((err) => {
    console.error("Product import failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
