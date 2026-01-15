"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import ExportDropdown from "@/components/ExportDropdown";

type Category = { id: string; name: string };

type Brand = { id: string; name: string; isActive: boolean };

type ProductImage = { id: string; url: string; isPrimary: boolean };

export type ProductRow = {
  id: string;
  title: string;
  slug: string;
  sku: string | null;
  price: number;
  salePrice: number | null;
  stock: number;
  isActive: boolean;
  createdAt: string;
  vendor: { id: string; shopName: string; status: string };
  category: { id: string; name: string };
  images: ProductImage[];
};

type ProductRowApi = Omit<ProductRow, "price" | "salePrice"> & {
  price?: number;
  salePrice?: number | null;
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
  dimensions: { length?: number; width?: number; height?: number } | null;
  shippingClass: string | null;
  countryOfOrigin?: string | null;
  warranty?: string | null;
  returnPolicy?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  sizeOptions?: string | null;
  colorOptions?: string | null;
  vendor: { id: string; shopName: string; status: string };
  variants: ProductVariant[];
  tags: Array<{ tag: { name: string } }>;
  images: ProductImage[];
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

  for (const v of cleaned) {
    if (!Number.isFinite(v.price) || v.price <= 0) return { ok: false as const, error: "Invalid variant price" };
    if (!Number.isFinite(v.stock) || v.stock < 0) return { ok: false as const, error: "Invalid variant stock" };
    if (v.salePrice !== null && (!Number.isFinite(v.salePrice) || v.salePrice <= 0)) {
      return { ok: false as const, error: "Invalid variant sale price" };
    }
  }

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

export default function ProductsClient({
  initialProducts,
  mode = "all",
}: {
  initialProducts: ProductRow[];
  mode?: "all" | "create";
}) {
  const [products, setProducts] = useState<ProductRow[]>(initialProducts);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);

  // create form
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState<string>("");
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [mrp, setMrp] = useState("");
  const [price, setPrice] = useState("999");
  const [salePrice, setSalePrice] = useState("");
  const [stock, setStock] = useState("10");
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
  const [eCategoryId, setECategoryId] = useState("");
  const [eBrandId, setEBrandId] = useState<string>("");
  const [eCurrency, setECurrency] = useState<"INR" | "USD">("INR");
  const [eMrp, setEMrp] = useState("");
  const [ePrice, setEPrice] = useState("");
  const [eSalePrice, setESalePrice] = useState("");
  const [eStock, setEStock] = useState("");
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

  async function uploadToServer(file: File) {
    const form = new FormData();
    form.append("file", file);
    form.append("purpose", "products");

    const uploadRes = await fetch("/api/upload", {
      method: "POST",
      credentials: "include",
      body: form,
    });

    const uploaded = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok) throw new Error(uploaded?.error || "Upload failed");

    const url = String(uploaded?.url || "");
    if (!url) throw new Error("Upload failed");
    return url;
  }

  async function attachImage(productId: string, url: string) {
    const res = await fetch(`/api/admin/products/${productId}/images`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) throw new Error(data?.error || "Save image failed");
  }

  async function setPrimaryImage(productId: string, imageId: string) {
    const res = await fetch(`/api/admin/products/${productId}/images/${imageId}/primary`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) throw new Error(data?.error || "Primary failed");
  }

  async function deleteImage(productId: string, imageId: string) {
    const res = await fetch(`/api/admin/products/${productId}/images/${imageId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) throw new Error(data?.error || "Delete failed");
  }

  async function loadCategories() {
    const res = await fetch("/api/admin/categories", { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return;
    const cats = (data.data?.categories || []) as Category[];
    setCategories(cats);
    if (!categoryId && cats?.[0]?.id) setCategoryId(cats[0].id);
  }

  async function loadBrands() {
    const res = await fetch("/api/admin/brands", { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return;
    const rows = (data.data?.brands || []) as Array<{ id: string; name: string; isActive: boolean }>;
    setBrands(rows);
  }

  useEffect(() => {
    loadCategories();
    loadBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reload() {
    setLoading(true);
    const res = await fetch("/api/admin/products?take=50", { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Failed to load products");
      setLoading(false);
      return;
    }
    const raw = (data.data?.products || []) as ProductRowApi[];
    setProducts(
      raw.map<ProductRow>((p) => ({
        ...p,
        price: Number(p.price ?? 0),
        salePrice: p.salePrice == null ? null : Number(p.salePrice),
      })),
    );
    setLoading(false);
  }

  async function setActive(productId: string, isActive: boolean) {
    const res = await fetch(`/api/admin/products/${productId}/active`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Update failed");
      return;
    }
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, isActive } : p)));
  }

  async function createProduct() {
    try {
      const parsedMrp = mrp.trim() ? Number(mrp) : null;
      if (parsedMrp != null && (!Number.isFinite(parsedMrp) || parsedMrp <= 0)) {
        throw new Error("Invalid MRP");
      }

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

      const tagList = toTagList(tags);
      const dimensions =
        dimL || dimW || dimH
          ? {
              ...(dimL ? { length: Number(dimL) } : {}),
              ...(dimW ? { width: Number(dimW) } : {}),
              ...(dimH ? { height: Number(dimH) } : {}),
            }
          : null;

      const res = await fetch("/api/admin/products", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug: slug.trim() ? slug.trim() : null,
          shortDescription: shortDescription.trim() ? shortDescription.trim() : null,
          description: description.trim() ? description.trim() : null,
          categoryId,
          brandId: brandId ? brandId : null,
          currency,
          mrp: parsedMrp,
          ...(!hasVariants
            ? {
                price: Number(price),
                salePrice: salePrice.trim() ? Number(salePrice) : null,
                stock: Number(stock),
                sku: sku.trim() ? sku.trim() : null,
              }
            : {}),
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
          ...(hasVariants ? { variants } : {}),
          isActive: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Create failed");

      toast.success("Product created");
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
      await reload();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      toast.error(message);
    }
  }

  async function openEdit(productId: string) {
    setEditOpen(true);
    setEditLoading(true);
    setEditProductId(productId);

    try {
      const res = await fetch(`/api/admin/products/${productId}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to load product");
      const p = (data.data?.product || null) as ProductDetails | null;
      if (!p) throw new Error("Failed to load product");

      setETitle(p.title);
      setESlug(p.slug ?? "");
      setEShortDescription(p.shortDescription ?? "");
      setEDescription(p.description ?? "");
      setECategoryId(p.categoryId);
      setEBrandId(p.brandId ?? "");
      setECurrency(p.currency ?? "INR");
      setEMrp(p.mrp != null ? String(p.mrp) : "");
      setEPrice(String(p.price ?? ""));
      setESalePrice(p.salePrice != null ? String(p.salePrice) : "");
      setEStock(String(p.stock ?? ""));
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
      toast.error(message);
      setEditOpen(false);
    } finally {
      setEditLoading(false);
    }
  }

  async function saveEdit() {
    if (!editProductId) return;
    try {
      const parsedMrp = eMrp.trim() ? Number(eMrp) : null;
      if (parsedMrp != null && (!Number.isFinite(parsedMrp) || parsedMrp <= 0)) {
        throw new Error("Invalid MRP");
      }

      const vParsed = variantRowsToPayload(editVariants);
      if (!vParsed.ok) throw new Error(vParsed.error);
      const variants = vParsed.variants;
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

      const tagList = toTagList(eTags);
      const dims =
        eDimL || eDimW || eDimH
          ? {
              ...(eDimL ? { length: Number(eDimL) } : {}),
              ...(eDimW ? { width: Number(eDimW) } : {}),
              ...(eDimH ? { height: Number(eDimH) } : {}),
            }
          : null;

      const res = await fetch(`/api/admin/products/${editProductId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: eTitle,
          slug: eSlug.trim() ? eSlug.trim() : undefined,
          shortDescription: eShortDescription.trim() ? eShortDescription.trim() : null,
          description: eDescription.trim() ? eDescription.trim() : null,
          categoryId: eCategoryId,
          brandId: eBrandId ? eBrandId : null,
          currency: eCurrency,
          mrp: parsedMrp,
          ...(!includeVariants
            ? {
                price: Number(ePrice),
                salePrice: eSalePrice.trim() ? Number(eSalePrice) : null,
                stock: Number(eStock),
                sku: eSku.trim() ? eSku.trim() : null,
              }
            : {}),
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

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Update failed");

      toast.success("Updated");
      setEditOpen(false);
      await reload();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      toast.error(message);
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product?")) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE", credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Delete failed");
      return;
    }
    toast.success("Deleted");
    await reload();
  }

  async function uploadForProduct(productId: string, file: File) {
    try {
      const url = await uploadToServer(file);
      await attachImage(productId, url);
      toast.success("Image uploaded");
      await reload();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed";
      toast.error(message);
    }
  }

  async function setPrimary(productId: string, imageId: string) {
    try {
      await setPrimaryImage(productId, imageId);
      toast.success("Primary set");
      await reload();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Primary failed";
      toast.error(message);
    }
  }

  async function removeImage(productId: string, imageId: string) {
    if (!confirm("Delete this image?")) return;
    try {
      await deleteImage(productId, imageId);
      toast.success("Image deleted");
      await reload();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Delete failed";
      toast.error(message);
    }
  }

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Admin Products</CardTitle>
                <CardDescription>Create / manage products (admin store + any vendor products).</CardDescription>
              </div>
              <ExportDropdown filenameBase="Bohosaaz_Admin_Products" csv={{ href: "/api/export/admin/products.csv" }} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">Dashboard: Admin</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
                  Refresh
                </Button>
                <Link className="text-sm text-primary underline" href="/admin/categories">
                  Manage Categories →
                </Link>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Create product</CardTitle>
                  <CardDescription>Same fields as vendor products.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />

                  <Input placeholder="Slug (optional)" value={slug} onChange={(e) => setSlug(e.target.value)} />

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
                  </div>

                  <div className="grid gap-1">
                    <div className="text-xs text-muted-foreground">Brand (optional)</div>
                    <Select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                      <option value="">No brand</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                          {b.isActive ? "" : " (inactive)"}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="grid gap-1">
                    <div className="text-xs text-muted-foreground">Currency</div>
                    <Select value={currency} onChange={(e) => setCurrency(e.target.value as "INR" | "USD")}>
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input
                      placeholder={`MRP (${currency}, optional)`}
                      inputMode="numeric"
                      value={mrp}
                      onChange={(e) => setMrp(e.target.value)}
                    />
                    <Input placeholder={`Price (${currency})`} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
                    <Input
                      placeholder={`Sale price (${currency}, optional)`}
                      inputMode="numeric"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                    />
                    <Input placeholder="Stock" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} />
                    <Input placeholder="SKU (optional)" value={sku} onChange={(e) => setSku(e.target.value)} />
                    <Input placeholder="Barcode (optional)" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input placeholder="Material (optional)" value={material} onChange={(e) => setMaterial(e.target.value)} />
                    <Input placeholder="Shipping class (optional)" value={shippingClass} onChange={(e) => setShippingClass(e.target.value)} />
                    <Input placeholder="Weight (optional)" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
                    <Input placeholder="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} />
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
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-muted-foreground">Variants (optional)</div>
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
                              <TD className="p-2"><Input value={row.size} onChange={(e) => updateVariantRow(setCreateVariants, idx, { size: e.target.value })} placeholder="M" /></TD>
                              <TD className="p-2"><Input value={row.color} onChange={(e) => updateVariantRow(setCreateVariants, idx, { color: e.target.value })} placeholder="Red" /></TD>
                              <TD className="p-2"><Input value={row.sku} onChange={(e) => updateVariantRow(setCreateVariants, idx, { sku: e.target.value })} placeholder="SKU-M-RED" /></TD>
                              <TD className="p-2"><Input inputMode="numeric" value={row.price} onChange={(e) => updateVariantRow(setCreateVariants, idx, { price: e.target.value })} placeholder="1200" /></TD>
                              <TD className="p-2"><Input inputMode="numeric" value={row.salePrice} onChange={(e) => updateVariantRow(setCreateVariants, idx, { salePrice: e.target.value })} placeholder="999" /></TD>
                              <TD className="p-2"><Input inputMode="numeric" value={row.stock} onChange={(e) => updateVariantRow(setCreateVariants, idx, { stock: e.target.value })} placeholder="5" /></TD>
                              <TD className="p-2">
                                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <input type="checkbox" className="h-4 w-4 rounded-[calc(var(--radius)-2px)] border border-border" checked={row.isActive} onChange={(e) => updateVariantRow(setCreateVariants, idx, { isActive: e.target.checked })} />
                                  Active
                                </label>
                              </TD>
                              <TD className="p-2">
                                <Button variant="ghost" size="sm" onClick={() => removeVariantRow(setCreateVariants, idx)}>Remove</Button>
                              </TD>
                            </TR>
                          ))}
                        </tbody>
                      </Table>
                    ) : null}
                  </div>

                  <Button disabled={title.trim().length < 3 || !categoryId || loading} onClick={createProduct}>
                    Create
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tip</CardTitle>
                  <CardDescription>Images can be uploaded per product row below.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Use “Edit” to manage variants/tags/attributes. Use “Upload image” to attach images.
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {mode === "all" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">All products</CardTitle>
              <CardDescription>Enable/disable, upload images, set primary, delete, or edit.</CardDescription>
            </CardHeader>
            <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : products.length === 0 ? (
              <div className="text-sm text-muted-foreground">No products yet</div>
            ) : (
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH className="w-[44%]">Product</TH>
                    <TH>Price</TH>
                    <TH>Stock</TH>
                    <TH>Status</TH>
                    <TH className="w-[28%]">Actions</TH>
                  </TR>
                </THead>
                <tbody>
                  {products.map((p) => (
                    <TR key={p.id}>
                      <TD>
                        <div className="font-semibold">{p.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.category?.name || "-"} · {p.vendor?.shopName || "-"} ({p.vendor?.status || "-"})
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {(p.images || []).map((img) => (
                            <div key={img.id} className="relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img.url} alt="product" className="h-14 w-14 rounded-(--radius) border border-border object-cover" />
                              <div className="mt-1 flex gap-1">
                                <button className="text-[10px] rounded-(--radius) border border-border px-2 py-0.5 hover:bg-muted/60 transition-colors" onClick={() => setPrimary(p.id, img.id)}>
                                  Primary
                                </button>
                                <button className="text-[10px] rounded-(--radius) border border-border px-2 py-0.5 hover:bg-muted/60 transition-colors" onClick={() => removeImage(p.id, img.id)}>
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
                              await uploadForProduct(p.id, file);
                              e.target.value = "";
                            }}
                          />

                          <div className="flex flex-wrap gap-2">
                            <Button variant="danger" size="sm" onClick={() => deleteProduct(p.id)}>
                              Delete
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setActive(p.id, !p.isActive)}>
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
        ) : null}

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
                      {b.isActive ? "" : " (inactive)"}
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
                <Input
                  placeholder={`MRP (${eCurrency}, optional)`}
                  inputMode="numeric"
                  value={eMrp}
                  onChange={(e) => setEMrp(e.target.value)}
                />
                <Input placeholder={`Price (${eCurrency})`} inputMode="numeric" value={ePrice} onChange={(e) => setEPrice(e.target.value)} />
                <Input
                  placeholder={`Sale price (${eCurrency}, optional)`}
                  inputMode="numeric"
                  value={eSalePrice}
                  onChange={(e) => setESalePrice(e.target.value)}
                />
                <Input placeholder="Stock" inputMode="numeric" value={eStock} onChange={(e) => setEStock(e.target.value)} />
                <Input placeholder="SKU (optional)" value={eSku} onChange={(e) => setESku(e.target.value)} />
                <Input placeholder="Barcode (optional)" value={eBarcode} onChange={(e) => setEBarcode(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input placeholder="Material (optional)" value={eMaterial} onChange={(e) => setEMaterial(e.target.value)} />
                <Input placeholder="Shipping class (optional)" value={eShippingClass} onChange={(e) => setEShippingClass(e.target.value)} />
                <Input placeholder="Weight (optional)" inputMode="decimal" value={eWeight} onChange={(e) => setEWeight(e.target.value)} />
                <Input placeholder="Tags (comma separated)" value={eTags} onChange={(e) => setETags(e.target.value)} />
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
                          <TD className="p-2"><Input value={row.size} onChange={(e) => updateVariantRow(setEditVariants, idx, { size: e.target.value })} placeholder="M" /></TD>
                          <TD className="p-2"><Input value={row.color} onChange={(e) => updateVariantRow(setEditVariants, idx, { color: e.target.value })} placeholder="Red" /></TD>
                          <TD className="p-2"><Input value={row.sku} onChange={(e) => updateVariantRow(setEditVariants, idx, { sku: e.target.value })} placeholder="SKU-M-RED" /></TD>
                          <TD className="p-2"><Input inputMode="numeric" value={row.price} onChange={(e) => updateVariantRow(setEditVariants, idx, { price: e.target.value })} placeholder="1200" /></TD>
                          <TD className="p-2"><Input inputMode="numeric" value={row.salePrice} onChange={(e) => updateVariantRow(setEditVariants, idx, { salePrice: e.target.value })} placeholder="999" /></TD>
                          <TD className="p-2"><Input inputMode="numeric" value={row.stock} onChange={(e) => updateVariantRow(setEditVariants, idx, { stock: e.target.value })} placeholder="5" /></TD>
                          <TD className="p-2">
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                              <input type="checkbox" className="h-4 w-4 rounded-[calc(var(--radius)-2px)] border border-border" checked={row.isActive} onChange={(e) => updateVariantRow(setEditVariants, idx, { isActive: e.target.checked })} />
                              Active
                            </label>
                          </TD>
                          <TD className="p-2"><Button variant="ghost" size="sm" onClick={() => removeVariantRow(setEditVariants, idx)}>Remove</Button></TD>
                        </TR>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <div className="text-xs text-muted-foreground">No variants. Add a row if needed.</div>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
