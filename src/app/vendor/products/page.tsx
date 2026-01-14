"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import ExportDropdown from "@/components/ExportDropdown";

type Category = { id: string; name: string };

type Brand = { id: string; name: string };

type ProductImage = { id: string; url: string; isPrimary: boolean };

type ProductListItem = {
  id: string;
  title: string;
  price: number;
  stock: number;
  isActive: boolean;
  images?: ProductImage[];
  category?: { name: string } | null;
};

type ProductVariant = {
  id: string;
  size: string;
  color: string | null;
  sku: string;
  price: number;
  salePrice: number | null;
  stock: number;
  isActive: boolean;
};

type ProductDetails = {
  id: string;
  title: string;
  slug?: string;
  description?: string | null;
  shortDescription?: string | null;
  currency: "INR" | "USD";
  mrp?: number | null;
  price: number;
  salePrice: number | null;
  stock: number;
  sku: string | null;
  barcode?: string | null;
  isActive: boolean;
  categoryId: string;
  brandId: string | null;
  material: string | null;
  weight: number | null;
  dimensions: {
    length?: number;
    width?: number;
    height?: number;
  } | null;
  shippingClass: string | null;
  countryOfOrigin?: string | null;
  warranty?: string | null;
  returnPolicy?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  sizeOptions?: string | null;
  colorOptions?: string | null;
  variants: ProductVariant[];
  tags: Array<{ tag: { name: string } }>;
};

type VariantRow = {
  size: string;
  color: string;
  sku: string;
  price: string;
  salePrice: string;
  stock: string;
  isActive: boolean;
};

function toTagList(input: string): string[] {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function variantRowsToPayload(rows: VariantRow[]) {
  const cleaned = rows
    .map((r) => ({
      size: r.size.trim(),
      color: r.color.trim(),
      sku: r.sku.trim(),
      price: Number(r.price),
      salePrice: r.salePrice.trim() ? Number(r.salePrice) : null,
      stock: Math.max(0, Math.floor(Number(r.stock))),
      isActive: r.isActive,
    }))
    .filter((v) => v.size && v.sku);

  // Validate required numeric fields
  for (const v of cleaned) {
    if (!Number.isFinite(v.price) || v.price <= 0) return { ok: false as const, error: "Invalid variant price" };
    if (!Number.isFinite(v.stock) || v.stock < 0) return { ok: false as const, error: "Invalid variant stock" };
    if (v.salePrice !== null && (!Number.isFinite(v.salePrice) || v.salePrice <= 0)) {
      return { ok: false as const, error: "Invalid variant sale price" };
    }
  }

  // Validate unique SKU (case-insensitive)
  const seen = new Set<string>();
  for (const v of cleaned) {
    const key = v.sku.toLowerCase();
    if (seen.has(key)) return { ok: false as const, error: "Duplicate variant SKU" };
    seen.add(key);
  }

  return {
    ok: true as const,
    variants: cleaned.map((v) => ({
      size: v.size,
      color: v.color ? v.color : null,
      sku: v.sku,
      price: v.price,
      salePrice: v.salePrice,
      stock: v.stock,
      isActive: v.isActive,
    })),
  };
}

export function VendorProductsClient({ mode = "all" }: { mode?: "all" | "create" }) {
  const [items, setItems] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  // create form
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [mrp, setMrp] = useState("");
  const [price, setPrice] = useState("999");
  const [salePrice, setSalePrice] = useState("");
  const [stock, setStock] = useState("10");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState<string>("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [material, setMaterial] = useState("");
  const [weight, setWeight] = useState("");
  const [shippingClass, setShippingClass] = useState("");
  const [countryOfOrigin, setCountryOfOrigin] = useState("");
  const [warranty, setWarranty] = useState("");
  const [returnPolicy, setReturnPolicy] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [sizeOptions, setSizeOptions] = useState("");
  const [colorOptions, setColorOptions] = useState("");
  const [dimL, setDimL] = useState("");
  const [dimW, setDimW] = useState("");
  const [dimH, setDimH] = useState("");
  const [tags, setTags] = useState("");
  const [createVariants, setCreateVariants] = useState<VariantRow[]>([]);

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [editLoadedVariantCount, setEditLoadedVariantCount] = useState(0);

  const [eTitle, setETitle] = useState("");
  const [eSlug, setESlug] = useState("");
  const [eShortDescription, setEShortDescription] = useState("");
  const [eDescription, setEDescription] = useState("");
  const [eCurrency, setECurrency] = useState<"INR" | "USD">("INR");
  const [eMrp, setEMrp] = useState("");
  const [ePrice, setEPrice] = useState("");
  const [eSalePrice, setESalePrice] = useState("");
  const [eStock, setEStock] = useState("");
  const [eCategoryId, setECategoryId] = useState("");
  const [eBrandId, setEBrandId] = useState<string>("");
  const [eSku, setESku] = useState("");
  const [eBarcode, setEBarcode] = useState("");
  const [eMaterial, setEMaterial] = useState("");
  const [eWeight, setEWeight] = useState("");
  const [eShippingClass, setEShippingClass] = useState("");
  const [eCountryOfOrigin, setECountryOfOrigin] = useState("");
  const [eWarranty, setEWarranty] = useState("");
  const [eReturnPolicy, setEReturnPolicy] = useState("");
  const [eMetaTitle, setEMetaTitle] = useState("");
  const [eMetaDescription, setEMetaDescription] = useState("");
  const [eMetaKeywords, setEMetaKeywords] = useState("");
  const [eSizeOptions, setESizeOptions] = useState("");
  const [eColorOptions, setEColorOptions] = useState("");
  const [eDimL, setEDimL] = useState("");
  const [eDimW, setEDimW] = useState("");
  const [eDimH, setEDimH] = useState("");
  const [eTags, setETags] = useState("");
  const [editVariants, setEditVariants] = useState<VariantRow[]>([]);

  async function loadProducts() {
    const res = await fetch("/api/vendor/products", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Failed to load products");
    const raw = Array.isArray(data?.products) ? data.products : [];
    setItems(
      raw.map((p: any) => ({
        ...p,
        price: Number(p?.price ?? 0),
      })),
    );
  }

  async function loadCategories() {
    const res = await fetch("/api/categories", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Failed to load categories");

    const cats: Category[] = data.categories || [];
    setCategories(cats);

    // auto select first
    if (!categoryId && cats?.[0]?.id) setCategoryId(cats[0].id);
  }

  async function loadBrands() {
    const res = await fetch("/api/brands?limit=40", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Failed to load brands");
    const rows: Array<{ id: string; name: string }> = data.brands || [];
    setBrands(rows);
  }

  async function init() {
    setLoading(true);
    setMsg(null);
    try {
      await Promise.all([loadCategories(), loadBrands(), loadProducts()]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Load failed";
      setMsg(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createProduct() {
    setMsg(null);
    try {
      const parsedMrp = mrp.trim() ? Number(mrp) : null;
      if (parsedMrp != null && (!Number.isFinite(parsedMrp) || parsedMrp <= 0)) {
        throw new Error("Invalid MRP");
      }

      const tagList = toTagList(tags);

      const vParsed = variantRowsToPayload(createVariants);
      if (!vParsed.ok) throw new Error(vParsed.error);
      const variants = vParsed.variants;

      if (createVariants.length > 0 && variants.length === 0) {
        throw new Error("Variant rows are incomplete (size + sku required)");
      }

      const hasVariants = variants.length > 0;

      if (!hasVariants) {
        const base = Number(price);
        if (!Number.isFinite(base) || base <= 0) throw new Error("Price is required");
        const sale = salePrice.trim() ? Number(salePrice) : null;
        if (sale != null && (!Number.isFinite(sale) || sale <= 0)) {
          throw new Error("Invalid sale price");
        }
        if (sale != null && sale >= base) throw new Error("Sale price must be less than price");
        if (parsedMrp != null && base > parsedMrp) throw new Error("Price must be less than or equal to MRP");
      }

      const dimensions =
        dimL || dimW || dimH
          ? {
              ...(dimL ? { length: Number(dimL) } : {}),
              ...(dimW ? { width: Number(dimW) } : {}),
              ...(dimH ? { height: Number(dimH) } : {}),
            }
          : null;

      const res = await fetch("/api/vendor/products", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug: slug.trim() ? slug.trim() : null,
          shortDescription: shortDescription.trim() ? shortDescription.trim() : null,
          description: description.trim() ? description.trim() : null,
          currency,
          mrp: parsedMrp,
          ...(!hasVariants
            ? {
                price: Number(price),
                salePrice: salePrice.trim() ? Number(salePrice) : null,
                sku: sku.trim() ? sku.trim() : null,
                stock: Number(stock),
              }
            : {}),
          categoryId,
          brandId: brandId ? brandId : null,
          barcode: barcode.trim() ? barcode.trim() : null,
          material: material.trim() ? material.trim() : null,
          weight: weight.trim() ? Number(weight) : null,
          shippingClass: shippingClass.trim() ? shippingClass.trim() : null,
          dimensions,
          countryOfOrigin: countryOfOrigin.trim() ? countryOfOrigin.trim() : null,
          warranty: warranty.trim() ? warranty.trim() : null,
          returnPolicy: returnPolicy.trim() ? returnPolicy.trim() : null,
          metaTitle: metaTitle.trim() ? metaTitle.trim() : null,
          metaDescription: metaDescription.trim() ? metaDescription.trim() : null,
          metaKeywords: metaKeywords.trim() ? metaKeywords.trim() : null,
          sizeOptions: sizeOptions.trim() ? sizeOptions.trim() : null,
          colorOptions: colorOptions.trim() ? colorOptions.trim() : null,
          tags: tagList,
          ...(variants.length ? { variants } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Create failed");

      setMsg("✅ Product created");
      setTitle("");
      setSlug("");
      setShortDescription("");
      setDescription("");
      setBrandId("");
      setSalePrice("");
      setCurrency("INR");
      setMrp("");
      setSku("");
      setBarcode("");
      setMaterial("");
      setWeight("");
      setShippingClass("");
      setCountryOfOrigin("");
      setWarranty("");
      setReturnPolicy("");
      setMetaTitle("");
      setMetaDescription("");
      setMetaKeywords("");
      setSizeOptions("");
      setColorOptions("");
      setDimL("");
      setDimW("");
      setDimH("");
      setTags("");
      setCreateVariants([]);
      await loadProducts();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      setMsg(`❌ ${message}`);
    }
  }

  function addVariantRow(setter: (updater: (prev: VariantRow[]) => VariantRow[]) => void) {
    setter((prev) => [
      ...prev,
      { size: "", color: "", sku: "", price: "", salePrice: "", stock: "0", isActive: true },
    ]);
  }

  function removeVariantRow(
    setter: (updater: (prev: VariantRow[]) => VariantRow[]) => void,
    index: number,
  ) {
    setter((prev) => prev.filter((_, i) => i !== index));
  }

  function updateVariantRow(
    setter: (updater: (prev: VariantRow[]) => VariantRow[]) => void,
    index: number,
    patch: Partial<VariantRow>,
  ) {
    setter((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function openEdit(productId: string) {
    setMsg(null);
    setEditOpen(true);
    setEditLoading(true);
    setEditProductId(productId);

    try {
      const res = await fetch(`/api/vendor/products/${productId}`, { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as { product?: ProductDetails; error?: string };
      if (!res.ok) throw new Error(data?.error || "Failed to load product");
      if (!data.product) throw new Error("Failed to load product");

      const p = data.product;
      setETitle(p.title);
      setESlug(p.slug ?? "");
      setEShortDescription(p.shortDescription ?? "");
      setEDescription(p.description ?? "");
      setECurrency(p.currency ?? "INR");
      setEMrp(p.mrp != null ? String(p.mrp) : "");
      setEPrice(String(p.price ?? ""));
      setESalePrice(p.salePrice != null ? String(p.salePrice) : "");
      setEStock(String(p.stock ?? ""));
      setECategoryId(p.categoryId);
      setEBrandId(p.brandId ?? "");
      setESku(p.sku ?? "");
      setEBarcode(p.barcode ?? "");
      setEMaterial(p.material ?? "");
      setEWeight(p.weight != null ? String(p.weight) : "");
      setEShippingClass(p.shippingClass ?? "");
      setECountryOfOrigin(p.countryOfOrigin ?? "");
      setEWarranty(p.warranty ?? "");
      setEReturnPolicy(p.returnPolicy ?? "");
      setEMetaTitle(p.metaTitle ?? "");
      setEMetaDescription(p.metaDescription ?? "");
      setEMetaKeywords(p.metaKeywords ?? "");
      setESizeOptions(p.sizeOptions ?? "");
      setEColorOptions(p.colorOptions ?? "");

      const dims = p.dimensions;
      setEDimL(dims?.length != null ? String(dims.length) : "");
      setEDimW(dims?.width != null ? String(dims.width) : "");
      setEDimH(dims?.height != null ? String(dims.height) : "");

      setETags((p.tags || []).map((t) => t.tag.name).join(", "));
      const loadedVariants = (p.variants || []).map((v) => ({
          size: v.size,
          color: v.color ?? "",
          sku: v.sku,
          price: String(v.price),
          salePrice: v.salePrice != null ? String(v.salePrice) : "",
          stock: String(v.stock),
          isActive: v.isActive,
      }));
      setEditLoadedVariantCount(loadedVariants.length);
      setEditVariants(loadedVariants);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      setMsg(`❌ ${message}`);
      setEditOpen(false);
    } finally {
      setEditLoading(false);
    }
  }

  async function saveEdit() {
    if (!editProductId) return;
    setMsg(null);
    try {
      const parsedMrp = eMrp.trim() ? Number(eMrp) : null;
      if (parsedMrp != null && (!Number.isFinite(parsedMrp) || parsedMrp <= 0)) {
        throw new Error("Invalid MRP");
      }

      const tagList = toTagList(eTags);
      const dims =
        eDimL || eDimW || eDimH
          ? {
              ...(eDimL ? { length: Number(eDimL) } : {}),
              ...(eDimW ? { width: Number(eDimW) } : {}),
              ...(eDimH ? { height: Number(eDimH) } : {}),
            }
          : null;

      const vParsed = variantRowsToPayload(editVariants);
      if (!vParsed.ok) throw new Error(vParsed.error);
      const variants = vParsed.variants;

      // If the product originally had variants and the vendor removed them all,
      // send variants: [] to allow reverting back to a non-variant product.
      const includeVariants = editLoadedVariantCount > 0 || variants.length > 0;

      if (!includeVariants) {
        const base = Number(ePrice);
        if (!Number.isFinite(base) || base <= 0) throw new Error("Price is required");
        const sale = eSalePrice.trim() ? Number(eSalePrice) : null;
        if (sale != null && (!Number.isFinite(sale) || sale <= 0)) {
          throw new Error("Invalid sale price");
        }
        if (sale != null && sale >= base) throw new Error("Sale price must be less than price");
        if (parsedMrp != null && base > parsedMrp) throw new Error("Price must be less than or equal to MRP");
      }

      const res = await fetch(`/api/vendor/products/${editProductId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: eTitle,
          slug: eSlug.trim() ? eSlug.trim() : undefined,
          shortDescription: eShortDescription.trim() ? eShortDescription.trim() : null,
          description: eDescription.trim() ? eDescription.trim() : null,
          currency: eCurrency,
          mrp: parsedMrp,
          ...(!includeVariants
            ? {
                price: Number(ePrice),
                salePrice: eSalePrice.trim() ? Number(eSalePrice) : null,
                sku: eSku.trim() ? eSku.trim() : null,
                stock: Number(eStock),
              }
            : {}),
          categoryId: eCategoryId,
          brandId: eBrandId ? eBrandId : null,
          barcode: eBarcode.trim() ? eBarcode.trim() : null,
          material: eMaterial.trim() ? eMaterial.trim() : null,
          weight: eWeight.trim() ? Number(eWeight) : null,
          shippingClass: eShippingClass.trim() ? eShippingClass.trim() : null,
          dimensions: dims,
          countryOfOrigin: eCountryOfOrigin.trim() ? eCountryOfOrigin.trim() : null,
          warranty: eWarranty.trim() ? eWarranty.trim() : null,
          returnPolicy: eReturnPolicy.trim() ? eReturnPolicy.trim() : null,
          metaTitle: eMetaTitle.trim() ? eMetaTitle.trim() : null,
          metaDescription: eMetaDescription.trim() ? eMetaDescription.trim() : null,
          metaKeywords: eMetaKeywords.trim() ? eMetaKeywords.trim() : null,
          sizeOptions: eSizeOptions.trim() ? eSizeOptions.trim() : null,
          colorOptions: eColorOptions.trim() ? eColorOptions.trim() : null,
          tags: tagList,
          ...(includeVariants ? { variants } : {}),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data?.error || "Update failed");

      setMsg("✅ Updated");
      setEditOpen(false);
      await loadProducts();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      setMsg(`❌ ${message}`);
    }
  }

  async function delProduct(id: string) {
    setMsg(null);
    try {
      const res = await fetch(`/api/vendor/products/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      setMsg("✅ Deleted");
      await loadProducts();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      setMsg(`❌ ${message}`);
    }
  }

  async function toggleActive(p: ProductListItem) {
    setMsg(null);
    try {
      const res = await fetch(`/api/vendor/products/${p.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Toggle failed");
      await loadProducts();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      setMsg(`❌ ${message}`);
    }
  }

  // Cloudinary signed upload
  async function uploadToCloudinary(file: File) {
    const sigRes = await fetch("/api/upload/signature", {
      method: "POST",
      credentials: "include",
    });
    const sig = await sigRes.json().catch(() => ({}));
    if (!sigRes.ok) throw new Error(sig?.error || "Signature failed");

    const form = new FormData();
    form.append("file", file);
    form.append("api_key", sig.apiKey);
    form.append("timestamp", String(sig.timestamp));
    form.append("signature", sig.signature);
    form.append("folder", sig.folder);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
      { method: "POST", body: form }
    );

    const uploaded = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok) throw new Error(uploaded?.error?.message || "Upload failed");

    return uploaded.secure_url as string;
  }

  async function attachImage(productId: string, url: string) {
    const res = await fetch(`/api/vendor/products/${productId}/images`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Save image failed");
    return data;
  }

  async function setPrimary(productId: string, imageId: string) {
    setMsg(null);
    const res = await fetch(`/api/vendor/products/${productId}/images/${imageId}/primary`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Primary failed");
    setMsg("✅ Primary set");
    await loadProducts();
  }

  async function deleteImage(productId: string, imageId: string) {
    setMsg(null);
    const res = await fetch(`/api/vendor/products/${productId}/images/${imageId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Delete failed");
    setMsg("✅ Image deleted");
    await loadProducts();
  }

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{mode === "create" ? "Add Product" : "Vendor Products"}</CardTitle>
                <CardDescription>
                  {mode === "create" ? "Create a new product." : "Create / manage your products."}
                </CardDescription>
              </div>
              {mode === "all" ? (
                <ExportDropdown filenameBase="Bohosaaz_Products" csv={{ href: "/api/export/vendor/products.csv" }} />
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {msg ? (
              <div
                className={
                  msg.startsWith("✅")
                    ? "mb-4 text-sm text-success"
                    : msg.startsWith("❌")
                      ? "mb-4 text-sm text-danger"
                      : "mb-4 text-sm text-muted-foreground"
                }
              >
                {msg}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Create product</CardTitle>
                  <CardDescription>Fill details and create a new product.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <Input
                    placeholder="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />

                  <Input
                    placeholder="Slug (optional)"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />

                  <textarea
                    className="min-h-20 w-full rounded-(--radius) border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/80 shadow-(--shadowInputInset) focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    placeholder="Short description (optional)"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                  />

                  <textarea
                    className="min-h-28 w-full rounded-(--radius) border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/80 shadow-(--shadowInputInset) focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    placeholder="Description (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />

                  <div className="grid gap-1">
                    <div className="text-xs text-muted-foreground">Category</div>
                    <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                      {categories.length === 0 ? (
                        <option value="">No categories</option>
                      ) : (
                        categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))
                      )}
                    </Select>
                    <div className="text-xs text-muted-foreground">
                      Categories admin create karta hai. Vendor sirf select karega.
                    </div>
                  </div>

                  <div className="grid gap-1">
                    <div className="text-xs text-muted-foreground">Brand (optional)</div>
                    <Select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                      <option value="">No brand</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="grid gap-1">
                    <div className="text-xs text-muted-foreground">Currency</div>
                    <Select value={currency} onChange={(e) => setCurrency(e.target.value as "INR" | "USD")}
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input placeholder="MRP (optional)" inputMode="numeric" value={mrp} onChange={(e) => setMrp(e.target.value)} />
                    <Input placeholder={`Price (${currency})`} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
                    <Input placeholder={`Sale price (${currency}, optional)`} inputMode="numeric" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
                    <Input
                      placeholder="Stock"
                      inputMode="numeric"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                    />
                    <Input
                      placeholder="SKU (optional)"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                    />
                    <Input placeholder="Barcode (optional)" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input
                      placeholder="Material (optional)"
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                    />
                    <Input
                      placeholder="Shipping class (optional)"
                      value={shippingClass}
                      onChange={(e) => setShippingClass(e.target.value)}
                    />
                    <Input
                      placeholder="Weight (optional)"
                      inputMode="decimal"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                    <Input
                      placeholder="Tags (comma separated)"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input placeholder="Country of origin (optional)" value={countryOfOrigin} onChange={(e) => setCountryOfOrigin(e.target.value)} />
                    <Input placeholder="Warranty (optional)" value={warranty} onChange={(e) => setWarranty(e.target.value)} />
                  </div>

                  <textarea
                    className="min-h-24 w-full rounded-(--radius) border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/80 shadow-(--shadowInputInset) focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    placeholder="Return policy (optional)"
                    value={returnPolicy}
                    onChange={(e) => setReturnPolicy(e.target.value)}
                  />

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input placeholder="Meta title (optional)" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
                    <Input placeholder="Meta keywords (optional)" value={metaKeywords} onChange={(e) => setMetaKeywords(e.target.value)} />
                  </div>

                  <textarea
                    className="min-h-20 w-full rounded-(--radius) border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/80 shadow-(--shadowInputInset) focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    placeholder="Meta description (optional)"
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                  />

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input placeholder="Size options (comma separated, optional)" value={sizeOptions} onChange={(e) => setSizeOptions(e.target.value)} />
                    <Input placeholder="Color options (comma separated, optional)" value={colorOptions} onChange={(e) => setColorOptions(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <div className="text-xs text-muted-foreground">Dimensions (optional)</div>
                    <div className="grid grid-cols-3 gap-3">
                      <Input placeholder="L" inputMode="decimal" value={dimL} onChange={(e) => setDimL(e.target.value)} />
                      <Input placeholder="W" inputMode="decimal" value={dimW} onChange={(e) => setDimW(e.target.value)} />
                      <Input placeholder="H" inputMode="decimal" value={dimH} onChange={(e) => setDimH(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <div className="text-xs text-muted-foreground">Variants (optional)</div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-muted-foreground">
                        Add rows. If you add variants, customers must pick size/color.
                      </div>
                      <Button variant="outline" size="sm" onClick={() => addVariantRow(setCreateVariants)}>
                        Add variant
                      </Button>
                    </div>

                    {createVariants.length ? (
                      <Table>
                        <THead>
                          <TR className="hover:bg-transparent">
                            <TH>Size</TH>
                            <TH>Color</TH>
                            <TH>SKU</TH>
                            <TH>Price</TH>
                            <TH>Sale</TH>
                            <TH>Stock</TH>
                            <TH>Active</TH>
                            <TH className="w-[1%]"> </TH>
                          </TR>
                        </THead>
                        <tbody>
                          {createVariants.map((row, idx) => (
                            <TR key={idx}>
                              <TD className="p-2">
                                <Input
                                  value={row.size}
                                  onChange={(e) =>
                                    updateVariantRow(setCreateVariants, idx, { size: e.target.value })
                                  }
                                  placeholder="M"
                                />
                              </TD>
                              <TD className="p-2">
                                <Input
                                  value={row.color}
                                  onChange={(e) =>
                                    updateVariantRow(setCreateVariants, idx, { color: e.target.value })
                                  }
                                  placeholder="Red"
                                />
                              </TD>
                              <TD className="p-2">
                                <Input
                                  value={row.sku}
                                  onChange={(e) =>
                                    updateVariantRow(setCreateVariants, idx, { sku: e.target.value })
                                  }
                                  placeholder="SKU-M-RED"
                                />
                              </TD>
                              <TD className="p-2">
                                <Input
                                  inputMode="numeric"
                                  value={row.price}
                                  onChange={(e) =>
                                    updateVariantRow(setCreateVariants, idx, { price: e.target.value })
                                  }
                                  placeholder="1200"
                                />
                              </TD>
                              <TD className="p-2">
                                <Input
                                  inputMode="numeric"
                                  value={row.salePrice}
                                  onChange={(e) =>
                                    updateVariantRow(setCreateVariants, idx, { salePrice: e.target.value })
                                  }
                                  placeholder="999"
                                />
                              </TD>
                              <TD className="p-2">
                                <Input
                                  inputMode="numeric"
                                  value={row.stock}
                                  onChange={(e) =>
                                    updateVariantRow(setCreateVariants, idx, { stock: e.target.value })
                                  }
                                  placeholder="5"
                                />
                              </TD>
                              <TD className="p-2">
                                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded-[calc(var(--radius)-2px)] border border-border"
                                    checked={row.isActive}
                                    onChange={(e) =>
                                      updateVariantRow(setCreateVariants, idx, {
                                        isActive: e.target.checked,
                                      })
                                    }
                                  />
                                  Active
                                </label>
                              </TD>
                              <TD className="p-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeVariantRow(setCreateVariants, idx)}
                                >
                                  Remove
                                </Button>
                              </TD>
                            </TR>
                          ))}
                        </tbody>
                      </Table>
                    ) : null}
                    <div className="text-xs text-muted-foreground">
                      If you add variants, customers must pick size/color on the product page.
                    </div>
                  </div>

                  <Button
                    disabled={title.trim().length < 3 || !categoryId || loading}
                    onClick={createProduct}
                  >
                    Create
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick link</CardTitle>
                  <CardDescription>Update item status and tracking.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link className="text-sm text-primary underline" href="/vendor/orders">
                    Go to Orders →
                  </Link>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {mode === "all" ? (
          <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your products</CardTitle>
              <CardDescription>Upload images, set primary, enable/disable, or delete.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : items.length === 0 ? (
                <div className="text-sm text-muted-foreground">No products yet</div>
              ) : (
                <Table>
                  <THead>
                    <TR className="hover:bg-transparent">
                      <TH className="w-[44%]">Title</TH>
                      <TH>Price</TH>
                      <TH>Stock</TH>
                      <TH>Status</TH>
                      <TH className="w-[26%]">Actions</TH>
                    </TR>
                  </THead>
                  <tbody>
                    {items.map((p) => (
                      <TR key={p.id}>
                        <TD>
                          <div className="font-semibold">{p.title}</div>
                          <div className="text-xs text-muted-foreground">{p.category?.name || "-"}</div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {(p.images || []).map((img) => (
                              <div key={img.id} className="relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={img.url}
                                  alt="product"
                                  className="h-14 w-14 rounded-(--radius) border border-border object-cover"
                                />

                                <div className="mt-1 flex gap-1">
                                  <button
                                    className="text-[10px] rounded-(--radius) border border-border px-2 py-0.5 hover:bg-muted/60 transition-colors"
                                    onClick={() => setPrimary(p.id, img.id)}
                                  >
                                    Primary
                                  </button>
                                  <button
                                    className="text-[10px] rounded-(--radius) border border-border px-2 py-0.5 hover:bg-muted/60 transition-colors"
                                    onClick={() => deleteImage(p.id, img.id)}
                                  >
                                    Del
                                  </button>
                                </div>

                                {img.isPrimary && (
                                  <div className="absolute -top-2 -right-2 text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                                    Primary
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </TD>

                      <TD>₹{p.price}</TD>
                      <TD>{p.stock}</TD>
                      <TD className={p.isActive ? "text-success font-semibold" : "text-muted-foreground"}>
                        {p.isActive ? "ACTIVE" : "DISABLED"}
                      </TD>

                      <TD>
                        <div className="flex flex-col gap-2">
                          <div className="text-xs text-muted-foreground">Upload image</div>
                          <input
                            type="file"
                            accept="image/*"
                            className="text-xs text-muted-foreground"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;

                              setMsg(null);
                              try {
                                const url = await uploadToCloudinary(file);
                                await attachImage(p.id, url);
                                setMsg("✅ Image uploaded");
                                await loadProducts();
                              } catch (err) {
                                const message = err instanceof Error ? err.message : "Upload error";
                                setMsg(`❌ ${message}`);
                              } finally {
                                e.target.value = "";
                              }
                            }}
                          />

                          <div className="flex flex-wrap gap-2">
                            <Button variant="danger" size="sm" onClick={() => delProduct(p.id)}>
                              Delete
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => toggleActive(p)}>
                              {p.isActive ? "Disable" : "Enable"}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openEdit(p.id)}>
                              Edit
                            </Button>
                          </div>
                        </div>
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Modal
          open={editOpen}
          onOpenChange={(open) => {
            if (!open) setEditProductId(null);
            setEditOpen(open);
          }}
          title="Edit product"
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button disabled={editLoading || !editProductId} onClick={saveEdit}>
                Save
              </Button>
            </div>
          }
        >
          {editLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : (
            <div className="grid gap-4">
              <Input placeholder="Title" value={eTitle} onChange={(e) => setETitle(e.target.value)} />

              <Input placeholder="Slug" value={eSlug} onChange={(e) => setESlug(e.target.value)} />

              <textarea
                className="min-h-20 w-full rounded-(--radius) border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/80 shadow-(--shadowInputInset) focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                placeholder="Short description (optional)"
                value={eShortDescription}
                onChange={(e) => setEShortDescription(e.target.value)}
              />

              <textarea
                className="min-h-28 w-full rounded-(--radius) border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/80 shadow-(--shadowInputInset) focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                placeholder="Description (optional)"
                value={eDescription}
                onChange={(e) => setEDescription(e.target.value)}
              />

              <div className="grid gap-1">
                <div className="text-xs text-muted-foreground">Category</div>
                <Select value={eCategoryId} onChange={(e) => setECategoryId(e.target.value)}>
                  {categories.length === 0 ? (
                    <option value="">No categories</option>
                  ) : (
                    categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))
                  )}
                </Select>
              </div>

              <div className="grid gap-1">
                <div className="text-xs text-muted-foreground">Brand (optional)</div>
                <Select value={eBrandId} onChange={(e) => setEBrandId(e.target.value)}>
                  <option value="">No brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-1">
                <div className="text-xs text-muted-foreground">Currency</div>
                <Select value={eCurrency} onChange={(e) => setECurrency(e.target.value as "INR" | "USD")}>
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input placeholder="MRP (optional)" inputMode="numeric" value={eMrp} onChange={(e) => setEMrp(e.target.value)} />
                <Input placeholder={`Price (${eCurrency})`} inputMode="numeric" value={ePrice} onChange={(e) => setEPrice(e.target.value)} />
                <Input placeholder={`Sale price (${eCurrency}, optional)`} inputMode="numeric" value={eSalePrice} onChange={(e) => setESalePrice(e.target.value)} />
                <Input
                  placeholder="Stock"
                  inputMode="numeric"
                  value={eStock}
                  onChange={(e) => setEStock(e.target.value)}
                />
                <Input placeholder="SKU (optional)" value={eSku} onChange={(e) => setESku(e.target.value)} />
                <Input placeholder="Barcode (optional)" value={eBarcode} onChange={(e) => setEBarcode(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Material (optional)"
                  value={eMaterial}
                  onChange={(e) => setEMaterial(e.target.value)}
                />
                <Input
                  placeholder="Shipping class (optional)"
                  value={eShippingClass}
                  onChange={(e) => setEShippingClass(e.target.value)}
                />
                <Input
                  placeholder="Weight (optional)"
                  inputMode="decimal"
                  value={eWeight}
                  onChange={(e) => setEWeight(e.target.value)}
                />
                <Input
                  placeholder="Tags (comma separated)"
                  value={eTags}
                  onChange={(e) => setETags(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input placeholder="Country of origin (optional)" value={eCountryOfOrigin} onChange={(e) => setECountryOfOrigin(e.target.value)} />
                <Input placeholder="Warranty (optional)" value={eWarranty} onChange={(e) => setEWarranty(e.target.value)} />
              </div>

              <textarea
                className="min-h-24 w-full rounded-(--radius) border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/80 shadow-(--shadowInputInset) focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                placeholder="Return policy (optional)"
                value={eReturnPolicy}
                onChange={(e) => setEReturnPolicy(e.target.value)}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input placeholder="Meta title (optional)" value={eMetaTitle} onChange={(e) => setEMetaTitle(e.target.value)} />
                <Input placeholder="Meta keywords (optional)" value={eMetaKeywords} onChange={(e) => setEMetaKeywords(e.target.value)} />
              </div>

              <textarea
                className="min-h-20 w-full rounded-(--radius) border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/80 shadow-(--shadowInputInset) focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                placeholder="Meta description (optional)"
                value={eMetaDescription}
                onChange={(e) => setEMetaDescription(e.target.value)}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input placeholder="Size options (comma separated, optional)" value={eSizeOptions} onChange={(e) => setESizeOptions(e.target.value)} />
                <Input placeholder="Color options (comma separated, optional)" value={eColorOptions} onChange={(e) => setEColorOptions(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <div className="text-xs text-muted-foreground">Dimensions (optional)</div>
                <div className="grid grid-cols-3 gap-3">
                  <Input placeholder="L" inputMode="decimal" value={eDimL} onChange={(e) => setEDimL(e.target.value)} />
                  <Input placeholder="W" inputMode="decimal" value={eDimW} onChange={(e) => setEDimW(e.target.value)} />
                  <Input placeholder="H" inputMode="decimal" value={eDimH} onChange={(e) => setEDimH(e.target.value)} />
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">Variants</div>
                  <Button variant="outline" size="sm" onClick={() => addVariantRow(setEditVariants)}>
                    Add variant
                  </Button>
                </div>

                {editVariants.length ? (
                  <Table>
                    <THead>
                      <TR className="hover:bg-transparent">
                        <TH>Size</TH>
                        <TH>Color</TH>
                        <TH>SKU</TH>
                        <TH>Price</TH>
                        <TH>Sale</TH>
                        <TH>Stock</TH>
                        <TH>Active</TH>
                        <TH className="w-[1%]"> </TH>
                      </TR>
                    </THead>
                    <tbody>
                      {editVariants.map((row, idx) => (
                        <TR key={idx}>
                          <TD className="p-2">
                            <Input
                              value={row.size}
                              onChange={(e) => updateVariantRow(setEditVariants, idx, { size: e.target.value })}
                              placeholder="M"
                            />
                          </TD>
                          <TD className="p-2">
                            <Input
                              value={row.color}
                              onChange={(e) => updateVariantRow(setEditVariants, idx, { color: e.target.value })}
                              placeholder="Red"
                            />
                          </TD>
                          <TD className="p-2">
                            <Input
                              value={row.sku}
                              onChange={(e) => updateVariantRow(setEditVariants, idx, { sku: e.target.value })}
                              placeholder="SKU-M-RED"
                            />
                          </TD>
                          <TD className="p-2">
                            <Input
                              inputMode="numeric"
                              value={row.price}
                              onChange={(e) => updateVariantRow(setEditVariants, idx, { price: e.target.value })}
                              placeholder="1200"
                            />
                          </TD>
                          <TD className="p-2">
                            <Input
                              inputMode="numeric"
                              value={row.salePrice}
                              onChange={(e) => updateVariantRow(setEditVariants, idx, { salePrice: e.target.value })}
                              placeholder="999"
                            />
                          </TD>
                          <TD className="p-2">
                            <Input
                              inputMode="numeric"
                              value={row.stock}
                              onChange={(e) => updateVariantRow(setEditVariants, idx, { stock: e.target.value })}
                              placeholder="5"
                            />
                          </TD>
                          <TD className="p-2">
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded-[calc(var(--radius)-2px)] border border-border"
                                checked={row.isActive}
                                onChange={(e) =>
                                  updateVariantRow(setEditVariants, idx, { isActive: e.target.checked })
                                }
                              />
                              Active
                            </label>
                          </TD>
                          <TD className="p-2">
                            <Button variant="ghost" size="sm" onClick={() => removeVariantRow(setEditVariants, idx)}>
                              Remove
                            </Button>
                          </TD>
                        </TR>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    No variants. Add a row if this product has size/color variants.
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>
        </>
        ) : null}
      </div>
    </div>
  );
}

export default function VendorProductsPage() {
  return <VendorProductsClient mode="all" />;
}


