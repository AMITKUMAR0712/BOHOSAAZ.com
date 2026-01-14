import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AccountWishlistClient, { type WishlistRow } from "@/components/account/AccountWishlistClient";

export const metadata = {
  title: "Wishlist • Bohosaaz",
  description: "Your saved items on Bohosaaz.",
};

export default async function AccountWishlistPage() {
  const me = await requireUser();
  if (!me) return null;

  const items = await prisma.wishlistItem.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        include: {
          images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }], take: 1 },
          vendor: { select: { shopName: true } },
        },
      },
    },
  });

  const initialItems: WishlistRow[] = items.map((it) => ({
    id: it.id,
    product: {
      id: it.product.id,
      slug: it.product.slug,
      title: it.product.title,
      currency: it.product.currency,
      price: Number(it.product.price),
      salePrice: it.product.salePrice == null ? null : Number(it.product.salePrice),
      imageUrl: it.product.images?.[0]?.url ?? null,
      vendorName: it.product.vendor?.shopName ?? null,
    },
  }));

  // Storefront routes are localized; default to English for cross-links.
  return <AccountWishlistClient langPrefix="/en" initialItems={initialItems} />;
}
