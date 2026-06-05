import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

loadEnvFile(".env");
loadEnvFile(".env.local");

const prisma = new PrismaClient();

const PRODUCT_SUFFIX = "gift-noida-greater-noida-delhi-ncr";
const CATEGORY_SUFFIX = "gifts-noida-delhi-ncr";
const BRAND_SUFFIX = "gift-products-noida-delhi-ncr";
const BLOG_SUFFIX = "gift-guide-noida-delhi-ncr";
const MAX_SLUG_LENGTH = 155;

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

function slugify(input: string, maxLength = MAX_SLUG_LENGTH) {
  return input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}

function removeRepeatedSeoTerms(input: string) {
  return input
    .replace(/\b(gift|gifts|gift-products|online-gifts)\b/gi, " ")
    .replace(/\b(noida|greater-noida|greater noida|new-delhi|new delhi|delhi-ncr|delhi ncr|ncr)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSeoSlug(parts: Array<string | null | undefined>, suffix: string, maxLength = MAX_SLUG_LENGTH) {
  const base = slugify(removeRepeatedSeoTerms(parts.filter(Boolean).join(" ")), maxLength);
  const suffixSlug = slugify(suffix, maxLength);
  const room = Math.max(20, maxLength - suffixSlug.length - 1);
  const compactBase = slugify(base, room);
  return slugify(`${compactBase}-${suffixSlug}`, maxLength);
}

async function uniqueSlug<T extends "product" | "category" | "brand" | "blogPost">(
  model: T,
  baseSlug: string,
  currentId: string,
) {
  let candidate = baseSlug;
  for (let i = 0; i < 20; i++) {
    const exists =
      model === "product"
        ? await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } })
        : model === "category"
          ? await prisma.category.findUnique({ where: { slug: candidate }, select: { id: true } })
          : model === "brand"
            ? await prisma.brand.findUnique({ where: { slug: candidate }, select: { id: true } })
            : await prisma.blogPost.findUnique({ where: { slug: candidate }, select: { id: true } });

    if (!exists || exists.id === currentId) return candidate;

    const suffix = `-${i + 2}`;
    candidate = `${baseSlug.slice(0, MAX_SLUG_LENGTH - suffix.length).replace(/-+$/g, "")}${suffix}`;
  }

  const fallback = `-${currentId.slice(0, 6)}`;
  return `${baseSlug.slice(0, MAX_SLUG_LENGTH - fallback.length).replace(/-+$/g, "")}${fallback}`;
}

async function updateProducts() {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      title: true,
      slug: true,
      category: { select: { name: true } },
      brand: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  let changed = 0;
  for (const product of products) {
    const base = buildSeoSlug(
      [product.title, product.category?.name, product.brand?.name],
      PRODUCT_SUFFIX,
    );
    const slug = await uniqueSlug("product", base, product.id);
    if (slug === product.slug) continue;

    await prisma.product.update({
      where: { id: product.id },
      data: { slug },
    });
    changed++;
  }
  return changed;
}

async function updateCategories() {
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { position: "asc" },
  });

  let changed = 0;
  for (const category of categories) {
    const base = buildSeoSlug([category.name], CATEGORY_SUFFIX, 120);
    const slug = await uniqueSlug("category", base, category.id);
    if (slug === category.slug) continue;

    await prisma.category.update({
      where: { id: category.id },
      data: { slug },
    });
    changed++;
  }
  return changed;
}

async function updateBrands() {
  const brands = await prisma.brand.findMany({
    select: { id: true, name: true, slug: true, brandType: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  let changed = 0;
  for (const brand of brands) {
    const typeTerm = brand.brandType === "LUXURY" ? "luxury" : "popular";
    const base = buildSeoSlug([brand.name, typeTerm], BRAND_SUFFIX, 120);
    const slug = await uniqueSlug("brand", base, brand.id);
    if (slug === brand.slug) continue;

    await prisma.brand.update({
      where: { id: brand.id },
      data: { slug },
    });
    changed++;
  }
  return changed;
}

async function updateBlogPosts() {
  const posts = await prisma.blogPost.findMany({
    select: { id: true, title: true, slug: true },
    orderBy: { createdAt: "asc" },
  });

  let changed = 0;
  for (const post of posts) {
    const base = buildSeoSlug([post.title], BLOG_SUFFIX, 130);
    const slug = await uniqueSlug("blogPost", base, post.id);
    if (slug === post.slug) continue;

    await prisma.blogPost.update({
      where: { id: post.id },
      data: { slug },
    });
    changed++;
  }
  return changed;
}

async function main() {
  const [products, categories, brands, blogPosts] = await Promise.all([
    updateProducts(),
    updateCategories(),
    updateBrands(),
    updateBlogPosts(),
  ]);

  console.log("SEO slug update complete:");
  console.log(`  products: ${products}`);
  console.log(`  categories: ${categories}`);
  console.log(`  brands: ${brands}`);
  console.log(`  blog posts: ${blogPosts}`);
}

main()
  .catch((err) => {
    console.error("SEO slug update failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
