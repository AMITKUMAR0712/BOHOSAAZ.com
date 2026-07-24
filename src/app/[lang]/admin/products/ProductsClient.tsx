"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import ExportDropdown from "@/components/ExportDropdown";
import { DEFAULT_OCCASION_OPTIONS, DEFAULT_RECIPIENT_OPTIONS } from "@/lib/shopFilters";
import { compressImageForUpload } from "@/lib/compressImage";

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
  currency: "INR" | "USD";
  stock: number;
  status: "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED";
  isActive: boolean;
  forceCodOnly: boolean;
  isFeatured: boolean;
  isTrending: boolean;
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
  forceCodOnly: boolean;
  isFeatured: boolean;
  isTrending: boolean;
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

type ProductStatus = ProductRow["status"];

const statusLabel: Record<ProductStatus, string> = {
  DRAFT: "Draft",
  PENDING: "Pending",
  PUBLISHED: "Approved",
  REJECTED: "Rejected",
};

function statusBadgeClass(status: ProductStatus) {
  if (status === "PUBLISHED") return "bg-green-100 text-green-800";
  if (status === "REJECTED") return "bg-red-100 text-red-800";
  if (status === "PENDING") return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-800";
}

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
  const [creating, setCreating] = useState(false);
  const [codOnlyFilter, setCodOnlyFilter] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [occasionFilter, setOccasionFilter] = useState("");
  const [recipientFilter, setRecipientFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");
  const [rowImageUrls, setRowImageUrls] = useState<Record<string, string>>({});

  // create form
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState<string>("");
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [price, setPrice] = useState("999");
  const [salePrice, setSalePrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
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
  const [forceCodOnly, setForceCodOnly] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isTrending, setIsTrending] = useState(false);
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
  const [eForceCodOnly, setEForceCodOnly] = useState(false);
  const [eIsFeatured, setEIsFeatured] = useState(false);
  const [eIsTrending, setEIsTrending] = useState(false);
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
    const compressed = await compressImageForUpload(file);
    const form = new FormData();
    form.append("file", compressed);
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

  async function reload(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;
    if (!silent) setLoading(true);
    const params = new URLSearchParams({ take: "50" });
    if (occasionFilter) params.set("occasion", occasionFilter);
    if (recipientFilter) params.set("recipient", recipientFilter);
    if (availabilityFilter) params.set("availability", availabilityFilter);
    const res = await fetch(`/api/admin/products?${params}`, { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      if (!silent) toast.error(data?.error || "Failed to load products");
      if (!silent) setLoading(false);
      return;
    }
    const raw = (data.data?.products || []) as ProductRowApi[];
    const loaded = raw.map<ProductRow>((p) => ({
      ...p,
      price: Number(p.price ?? 0),
      salePrice: p.salePrice == null ? null : Number(p.salePrice),
      currency: p.currency === "USD" ? "USD" : "INR",
    }));
    setProducts(loaded);
    if (!silent) setLoading(false);
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occasionFilter, recipientFilter, availabilityFilter]);

  useEffect(() => {
    const syncProducts = () => {
      if (document.visibilityState !== "visible") return;
      void reload({ silent: true }).catch(() => {
        // Keep background sync quiet; manual actions still show errors.
      });
    };

    const interval = window.setInterval(syncProducts, 5000);
    window.addEventListener("focus", syncProducts);
    window.addEventListener("bohosaaz-live-refresh", syncProducts);
    document.addEventListener("visibilitychange", syncProducts);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", syncProducts);
      window.removeEventListener("bohosaaz-live-refresh", syncProducts);
      document.removeEventListener("visibilitychange", syncProducts);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occasionFilter, recipientFilter, availabilityFilter]);

  const vendorSummaries = useMemo(() => {
    const vendors = new Map<
      string,
      { id: string; name: string; status: string; total: number; active: number; published: number }
    >();

    for (const product of products) {
      const current = vendors.get(product.vendor.id) ?? {
        id: product.vendor.id,
        name: product.vendor.shopName || "Unnamed vendor",
        status: product.vendor.status || "-",
        total: 0,
        active: 0,
        published: 0,
      };

      current.total += 1;
      if (product.isActive) current.active += 1;
      if (product.status === "PUBLISHED") current.published += 1;
      vendors.set(product.vendor.id, current);
    }

    return Array.from(vendors.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const selectedVendor = vendorSummaries.find((vendor) => vendor.id === selectedVendorId);
  const vendorFilteredProducts = selectedVendorId
    ? products.filter((product) => product.vendor.id === selectedVendorId)
    : products;
  const visibleProducts = codOnlyFilter
    ? vendorFilteredProducts.filter((p) => p.forceCodOnly)
    : vendorFilteredProducts;

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

  async function setHomeSection(productId: string, patch: Pick<ProductRow, "isFeatured" | "isTrending">) {
    const res = await fetch(`/api/admin/products/${productId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Update failed");
      return;
    }
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, ...patch } : p)));
  }

  async function updateProductStatus(productId: string, status: ProductStatus) {
    const res = await fetch(`/api/admin/products/${productId}/status`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Update failed");
      return;
    }
    const updated = data?.product as Partial<ProductRow> | undefined;
    toast.success(`Product status updated to ${statusLabel[status]}`);
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              status,
              isActive: typeof updated?.isActive === "boolean" ? updated.isActive : status === "PUBLISHED",
            }
          : p,
      ),
    );
  }

  async function createProduct() {
    if (creating) return;
    setCreating(true);
    try {
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

      // Upload images first so a failed upload never leaves an orphan product with wrong stock photos.
      const pendingImageUrls = [
        imageUrl.trim(),
        ...(await Promise.all(imageFiles.map((file) => uploadToServer(file)))),
      ].filter(Boolean);

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
          currency: "INR",
          mrp: null,
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
          forceCodOnly,
          isFeatured,
          isTrending,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Create failed");

      const createdProductId = String(data?.data?.product?.id || "");
      if (!createdProductId) throw new Error("Product created but image setup failed");

      for (const url of pendingImageUrls) {
        await attachImage(createdProductId, url);
      }

      toast.success("Product created");
      setTitle("");
      setSlug("");
      setShortDescription("");
      setDescription("");
      setBrandId("");
      setSalePrice("");
      setCurrency("INR");
      setImageUrl("");
      setImageFiles([]);
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
      setForceCodOnly(false);
      setIsFeatured(false);
      setIsTrending(false);
      setCreateVariants([]);
      await reload();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      toast.error(message);
    } finally {
      setCreating(false);
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
      setECurrency(p.currency === "USD" ? "USD" : "INR");
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
      setEForceCodOnly(p.forceCodOnly ?? false);
      setEIsFeatured(p.isFeatured ?? false);
      setEIsTrending(p.isTrending ?? false);

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
          currency: "INR",
          mrp: null,
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
          forceCodOnly: eForceCodOnly,
          isFeatured: eIsFeatured,
          isTrending: eIsTrending,
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
      <div className={`mx-auto ${mode === "create" ? "max-w-7xl" : "max-w-6xl"} space-y-6`}>
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
                <Button variant="outline" size="sm" onClick={() => void reload()} disabled={loading}>
                  Refresh
                </Button>
                <Link className="text-sm text-primary underline" href="/admin/categories">
                  Manage Categories →
                </Link>
              </div>
            </div>

            {mode === "create" ? (
            <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
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
                    <div className="rounded-(--radius) border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">
                      INR (₹) only
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

                  <div className="rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="text-sm font-semibold">Product images</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Add local images or paste an image URL. The first image becomes primary automatically.
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Input
                        placeholder="https://... or /uploads/..."
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                      />
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="rounded-(--radius) border border-border bg-card px-3 py-2 text-sm text-muted-foreground"
                        onChange={(e) => setImageFiles(Array.from(e.target.files || []))}
                      />
                    </div>
                    {imageFiles.length ? (
                      <div className="mt-2 text-xs text-muted-foreground">{imageFiles.length} local image(s) selected</div>
                    ) : null}
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

                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 rounded-[calc(var(--radius)-2px)] border border-border" checked={forceCodOnly} onChange={(e) => setForceCodOnly(e.target.checked)} />
                    <span className="text-sm text-muted-foreground">COD available (customers can choose COD at checkout)</span>
                  </label>

                  <div className="rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="text-sm font-semibold">Homepage sections</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Only admin-selected products appear under these homepage headings.
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="h-4 w-4 rounded-[calc(var(--radius)-2px)] border border-border" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
                        <span className="text-sm text-muted-foreground">Show in Featured Products</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="h-4 w-4 rounded-[calc(var(--radius)-2px)] border border-border" checked={isTrending} onChange={(e) => setIsTrending(e.target.checked)} />
                        <span className="text-sm text-muted-foreground">Show in Trending Products</span>
                      </label>
                    </div>
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

                  <Button disabled={title.trim().length < 3 || !categoryId || loading || creating} onClick={createProduct}>
                    {creating ? "Creating…" : "Create"}
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
            ) : null}
          </CardContent>
        </Card>

        {mode === "all" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">All products</CardTitle>
              <CardDescription>Select one vendor to see all products inside that vendor.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 rounded-2xl border border-border bg-muted/20 p-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Vendor products</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedVendor
                        ? `${selectedVendor.name}: ${vendorFilteredProducts.length} product${vendorFilteredProducts.length === 1 ? "" : "s"}`
                        : "Showing products from all vendors"}
                    </div>
                  </div>
                  <div className="w-full sm:w-72">
                    <div className="mb-1 text-xs text-muted-foreground">Choose vendor</div>
                    <Select value={selectedVendorId} onChange={(event) => setSelectedVendorId(event.target.value)}>
                      <option value="">All vendors</option>
                      {vendorSummaries.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name} ({vendor.total})
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                {vendorSummaries.length ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {vendorSummaries.map((vendor) => (
                      <button
                        key={vendor.id}
                        type="button"
                        onClick={() => setSelectedVendorId(vendor.id)}
                        className={`rounded-2xl border p-4 text-left transition-colors ${
                          selectedVendorId === vendor.id
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{vendor.name}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{vendor.status}</div>
                          </div>
                          <div className="rounded-full bg-background px-2 py-0.5 text-xs font-semibold">
                            {vendor.total}
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div>Published: {vendor.published}</div>
                          <div>Active: {vendor.active}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mb-4 grid gap-3">
                <div className="grid gap-2 md:grid-cols-3">
                  <label className="grid gap-1">
                    <span className="text-xs text-muted-foreground">Occasion</span>
                    <Select value={occasionFilter} onChange={(event) => setOccasionFilter(event.target.value)}>
                      <option value="">All occasions</option>
                      {DEFAULT_OCCASION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </Select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-muted-foreground">Recipient</span>
                    <Select value={recipientFilter} onChange={(event) => setRecipientFilter(event.target.value)}>
                      <option value="">All recipients</option>
                      {DEFAULT_RECIPIENT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </Select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-muted-foreground">Availability</span>
                    <Select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)}>
                      <option value="">Any availability</option>
                      <option value="in_stock">In Stock</option>
                      <option value="discounted">Discounted</option>
                    </Select>
                  </label>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  {selectedVendorId ? (
                    <Button variant="outline" size="sm" onClick={() => setSelectedVendorId("")}>
                      Show all vendors
                    </Button>
                  ) : null}
                  <Button variant={codOnlyFilter ? "soft" : "outline"} size="sm" onClick={() => setCodOnlyFilter((value) => !value)}>
                    {codOnlyFilter ? "Show all products" : "Show COD products"}
                  </Button>
                  {(occasionFilter || recipientFilter || availabilityFilter) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setOccasionFilter("");
                        setRecipientFilter("");
                        setAvailabilityFilter("");
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" onClick={() => void reload()} disabled={loading}>
                    Refresh
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  {visibleProducts.length} product{visibleProducts.length === 1 ? "" : "s"}
                </div>
                </div>
              </div>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : visibleProducts.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  {codOnlyFilter ? "No COD-only products found" : "No products found for this vendor"}
                </div>
              ) : (
                <Table>
                  <THead>
                    <TR className="hover:bg-transparent">
                      <TH className="w-[44%]">Product</TH>
                      <TH>Price</TH>
                      <TH>Sale Price</TH>
                      <TH>Stock</TH>
                      <TH>Approval</TH>
                      <TH>Visibility</TH>
                      <TH className="w-[28%]">Actions</TH>
                    </TR>
                  </THead>
                  <tbody>
                    {visibleProducts.map((p) => (
                      <TR key={p.id}>
                        <TD>
                          <div className="font-semibold">{p.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.category?.name || "-"} · {p.vendor?.shopName || "-"} ({p.vendor?.status || "-"})
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {p.isFeatured ? (
                              <span className="rounded-full bg-purple-100 text-purple-800 px-2 py-0.5 text-[10px] font-semibold">
                                Featured
                              </span>
                            ) : null}
                            {p.isTrending ? (
                              <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-semibold">
                                Trending
                              </span>
                            ) : null}
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

                        <TD>{p.currency === "USD" ? "$" : "₹"}{p.price}</TD>
                        <TD>{p.salePrice != null ? `${p.currency === "USD" ? "$" : "₹"}${p.salePrice}` : "-"}</TD>
                        <TD>{p.stock}</TD>
                        <TD>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadgeClass(p.status)}`}>
                            {statusLabel[p.status]}
                          </span>
                        </TD>
                        <TD className={p.status === "PUBLISHED" && p.isActive ? "text-success font-semibold text-xs" : "text-muted-foreground text-xs"}>
                          {p.status === "PUBLISHED" && p.isActive ? "ACTIVE" : "INACTIVE"}
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
                            <div className="flex gap-2">
                              <Input
                                placeholder="Image URL"
                                value={rowImageUrls[p.id] || ""}
                                onChange={(e) => setRowImageUrls((prev) => ({ ...prev, [p.id]: e.target.value }))}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  const url = (rowImageUrls[p.id] || "").trim();
                                  if (!url) return;
                                  try {
                                    await attachImage(p.id, url);
                                    setRowImageUrls((prev) => ({ ...prev, [p.id]: "" }));
                                    toast.success("Image URL added");
                                    await reload();
                                  } catch (e) {
                                    const message = e instanceof Error ? e.message : "Save image failed";
                                    toast.error(message);
                                  }
                                }}
                              >
                                Add URL
                              </Button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {p.status === "PENDING" && (
                                <>
                                  <Button variant="primary" size="sm" onClick={() => updateProductStatus(p.id, "PUBLISHED")}>
                                    Approve
                                  </Button>
                                  <Button variant="danger" size="sm" onClick={() => updateProductStatus(p.id, "REJECTED")}>
                                    Reject
                                  </Button>
                                </>
                              )}
                              {p.status === "REJECTED" && (
                                <Button variant="primary" size="sm" onClick={() => updateProductStatus(p.id, "PUBLISHED")}>
                                  Approve
                                </Button>
                              )}
                              <Button variant="danger" size="sm" onClick={() => deleteProduct(p.id)}>
                                Delete
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={p.status !== "PUBLISHED"}
                                onClick={() => setActive(p.id, !(p.status === "PUBLISHED" && p.isActive))}
                              >
                                {p.status === "PUBLISHED" && p.isActive ? "Disable" : "Enable"}
                              </Button>
                              <Button
                                variant={p.isFeatured ? "soft" : "outline"}
                                size="sm"
                                onClick={() => setHomeSection(p.id, { isFeatured: !p.isFeatured, isTrending: p.isTrending })}
                              >
                                {p.isFeatured ? "Remove Featured" : "Mark Featured"}
                              </Button>
                              <Button
                                variant={p.isTrending ? "soft" : "outline"}
                                size="sm"
                                onClick={() => setHomeSection(p.id, { isFeatured: p.isFeatured, isTrending: !p.isTrending })}
                              >
                                {p.isTrending ? "Remove Trending" : "Mark Trending"}
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
                <div className="rounded-(--radius) border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">
                  INR (₹) only
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 rounded-[calc(var(--radius)-2px)] border border-border" checked={eForceCodOnly} onChange={(e) => setEForceCodOnly(e.target.checked)} />
                <span className="text-sm text-muted-foreground">Force COD Only (customers cannot use card payment)</span>
              </label>

              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <div className="text-sm font-semibold">Homepage sections</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Only admin-selected products appear under these homepage headings.
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 rounded-[calc(var(--radius)-2px)] border border-border" checked={eIsFeatured} onChange={(e) => setEIsFeatured(e.target.checked)} />
                    <span className="text-sm text-muted-foreground">Show in Featured Products</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 rounded-[calc(var(--radius)-2px)] border border-border" checked={eIsTrending} onChange={(e) => setEIsTrending(e.target.checked)} />
                    <span className="text-sm text-muted-foreground">Show in Trending Products</span>
                  </label>
                </div>
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
