import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Rng = () => number;

function mulberry32(seed: number): Rng {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: Rng, min: number, max: number) {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return Math.floor(rng() * (hi - lo + 1)) + lo;
}

function pick<T>(rng: Rng, arr: T[]) {
  return arr[randInt(rng, 0, arr.length - 1)]!;
}

function maybe(rng: Rng, p: number) {
  return rng() < p;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function rupeesToPaiseBig(rupees: number): bigint {
  if (!Number.isFinite(rupees)) return BigInt(0);
  return BigInt(Math.round(rupees * 100));
}

function isoDateDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function resetDb() {
  // FK-safe delete order (children first)
  await prisma.walletTransaction.deleteMany();
  await prisma.razorpayTopup.deleteMany();
  await prisma.commissionHistory.deleteMany();
  await prisma.commissionPlan.deleteMany();
  await prisma.payout.deleteMany();

  await prisma.orderItem.deleteMany();
  await prisma.vendorOrder.deleteMany();
  await prisma.couponRedemption.deleteMany();
  await prisma.order.deleteMany();

  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.product.deleteMany();

  await prisma.banner.deleteMany();
  await prisma.cmsPageVersion.deleteMany();
  await prisma.cmsPage.deleteMany();
  await prisma.contentPage.deleteMany();
  await prisma.blogPost.deleteMany();
  await prisma.contactMessage.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.setting.deleteMany();

  await prisma.notificationDelivery.deleteMany();
  await prisma.notificationBroadcast.deleteMany();
  await prisma.notificationTemplate.deleteMany();

  await prisma.webhookLog.deleteMany();
  await prisma.cronLog.deleteMany();
  await prisma.supportTicketMessage.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.auditLog.deleteMany();

  await prisma.walletAccount.deleteMany();
  await prisma.vendorBankAccount.deleteMany();
  await prisma.vendorKyc.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
}

async function getOrCreatePlatformWallet() {
  return prisma.walletAccount.upsert({
    where: { platformKey: "PLATFORM" },
    update: {},
    create: {
      kind: "PLATFORM",
      platformKey: "PLATFORM",
      balancePaise: BigInt(0),
    },
  });
}

async function getOrCreateUserWallet(userId: string) {
  return prisma.walletAccount.upsert({
    where: { userId },
    update: {},
    create: {
      kind: "USER",
      userId,
      balancePaise: BigInt(0),
    },
  });
}

async function getOrCreateVendorWallet(vendorId: string) {
  return prisma.walletAccount.upsert({
    where: { vendorId },
    update: {},
    create: {
      kind: "VENDOR",
      vendorId,
      balancePaise: BigInt(0),
    },
  });
}

async function postWalletTxn({
  walletId,
  type,
  direction,
  amountPaise,
  idempotencyKey,
  orderId,
  vendorOrderId,
  payoutId,
  razorpayOrderId,
  razorpayPaymentId,
  note,
}: {
  walletId: string;
  type:
    | "TOPUP"
    | "ORDER_PAYMENT"
    | "REFUND"
    | "PAYOUT"
    | "COMMISSION"
    | "ADJUSTMENT";
  direction: "CREDIT" | "DEBIT";
  amountPaise: bigint;
  idempotencyKey: string;
  orderId?: string;
  vendorOrderId?: string;
  payoutId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  note?: string;
}) {
  if (amountPaise <= BigInt(0)) return;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.walletTransaction.findUnique({ where: { idempotencyKey } });
    if (existing) return existing;

    const wallet = await tx.walletAccount.findUnique({ where: { id: walletId }, select: { id: true, kind: true, balancePaise: true } });
    if (!wallet) throw new Error("Wallet not found");

    const allowNegative = wallet.kind === "PLATFORM";

    let updatedBalance: bigint;
    if (direction === "CREDIT") {
      const updated = await tx.walletAccount.update({
        where: { id: walletId },
        data: { balancePaise: { increment: amountPaise } },
        select: { balancePaise: true },
      });
      updatedBalance = updated.balancePaise;
    } else {
      if (allowNegative) {
        const updated = await tx.walletAccount.update({
          where: { id: walletId },
          data: { balancePaise: { decrement: amountPaise } },
          select: { balancePaise: true },
        });
        updatedBalance = updated.balancePaise;
      } else {
        const res = await tx.walletAccount.updateMany({
          where: { id: walletId, balancePaise: { gte: amountPaise } },
          data: { balancePaise: { decrement: amountPaise } },
        });
        if (res.count !== 1) throw new Error("Insufficient wallet balance (seed)");
        const updated = await tx.walletAccount.findUnique({ where: { id: walletId }, select: { balancePaise: true } });
        if (!updated) throw new Error("Wallet not found");
        updatedBalance = updated.balancePaise;
      }
    }

    return tx.walletTransaction.create({
      data: {
        idempotencyKey,
        walletId,
        type,
        direction,
        status: "POSTED",
        amountPaise,
        balanceAfterPaise: updatedBalance,
        currency: "INR",
        note,
        orderId,
        vendorOrderId,
        payoutId,
        razorpayOrderId,
        razorpayPaymentId,
      },
    });
  });
}

async function main() {
  const seed = Number(process.env.SEED || 20251226);
  const rng = mulberry32(seed);

  console.log("🌱 Seeding with deterministic seed:", seed);

  await resetDb();

  // Core settings
  await prisma.setting.createMany({
    data: [
      { key: "site", value: { name: "Bohosaaz", currency: "INR" } },
      { key: "payout", value: { delayDays: 7 } },
      { key: "wallet", value: { minTopupRupees: 10, maxTopupRupees: 200000 } },
    ],
  });

  // Admin
  const adminEmail = "admin@bohosaaz.com";
  const adminPassword = "Admin@12345";
  const adminHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.create({
    data: {
      name: "Super Admin",
      email: adminEmail,
      password: adminHash,
      role: "ADMIN",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorRole: "ADMIN",
      action: "SEED",
      entity: "Database",
      meta: { seed },
    },
  });

  // Categories
  const categoryNames = [
    "Sarees",
    "Kurtas",
    "Jewelry",
    "Home Decor",
    "Bags",
    "Footwear",
    "Kids",
    "Winterwear",
    "Gifts",
    "Skincare",
  ];

  const categoryIconNames = [
    "Shirt",
    "Shirt",
    "Gem",
    "Home",
    "ShoppingBag",
    "Footprints",
    "Baby",
    "Snowflake",
    "Gift",
    "Sparkles",
  ];

  const categorySlugSet = new Set<string>();
  const categories = [] as Array<{ id: string; slug: string; name: string }>;
  for (let i = 0; i < categoryNames.length; i++) {
    const name = categoryNames[i]!;
    let slug = slugify(name);
    let n = 2;
    while (categorySlugSet.has(slug)) {
      slug = `${slugify(name)}-${n++}`;
    }
    categorySlugSet.add(slug);
    categories.push(
      await prisma.category.create({
        data: { name, slug, position: i, iconName: categoryIconNames[i] },
        select: { id: true, slug: true, name: true },
      })
    );
  }

  // Ads (basic seed)
  await prisma.ad.createMany({
    data: [
      {
        title: "Winter Collection",
        placement: "HOME_TOP",
        type: "IMAGE_BANNER",
        imageUrl: "/s4.jpg",
        linkUrl: "/offers",
        priority: 10,
        targetDevice: "ALL",
        isActive: true,
      },
      {
        title: "Limited Time Offer",
        placement: "FOOTER_STRIP",
        type: "HTML_SNIPPET",
        html: "<div style=\"padding:10px 14px\"><strong>Limited time:</strong> Extra offers live now.</div>",
        linkUrl: "/offers",
        priority: 5,
        targetDevice: "ALL",
        isActive: true,
      },
      {
        title: "Shop Bags",
        placement: "CATEGORY_TOP",
        type: "IMAGE_BANNER",
        imageUrl: "/s2.jpg",
        linkUrl: "/?q=bags",
        priority: 3,
        targetDevice: "MOBILE",
        isActive: true,
      },
    ],
    skipDuplicates: false,
  });

  // Tags
  const tagWords = [
    "handmade",
    "cotton",
    "silk",
    "eco",
    "limited",
    "new",
    "bestseller",
    "artisan",
    "organic",
    "festival",
    "classic",
    "premium",
  ];

  const tags = [] as Array<{ id: string; slug: string; name: string }>;
  for (const w of tagWords) {
    tags.push(
      await prisma.tag.create({
        data: {
          name: w.replace(/\b\w/g, (m) => m.toUpperCase()),
          slug: w,
        },
        select: { id: true, slug: true, name: true },
      })
    );
  }

  // Users + Vendors
  const firstNames = [
    "Aarav",
    "Vihaan",
    "Aditya",
    "Ishaan",
    "Ananya",
    "Diya",
    "Saanvi",
    "Mira",
    "Riya",
    "Kabir",
    "Meera",
    "Arjun",
  ];
  const lastNames = ["Sharma", "Gupta", "Patel", "Singh", "Khan", "Iyer", "Reddy", "Chopra", "Nair", "Das"];
  const shopAdjectives = ["Gaatha", "Weave", "Indigo", "Lotus", "Craft", "Heritage", "Rustic", "Nirvana", "Saffron", "Peacock"];
  const shopNouns = ["Studio", "Atelier", "Collective", "Handloom", "Bazaar", "Works", "House", "Corner", "Co.", "Gallery"];

  const brandLogos = ["/s1.jpg", "/s2.jpg", "/s3.jpg", "/s4.jpg", "/s5.jpg", "/s6.jpg", "/s7.jpg"];

  const passwordHash = await bcrypt.hash("User@12345", 10);

  const vendorCount = 10;
  const userCount = 40;

  const vendorUsers = [] as Array<{ id: string; email: string; phone: string | null }>;
  const vendors = [] as Array<{ id: string; commission: number; userId: string; shopName: string }>;

  for (let i = 0; i < vendorCount; i++) {
    const fn = pick(rng, firstNames);
    const ln = pick(rng, lastNames);
    const email = `vendor${i + 1}@bohosaaz.test`;

    const u = await prisma.user.create({
      data: {
        name: `${fn} ${ln}`,
        email,
        password: passwordHash,
        role: "VENDOR",
        phone: `9${randInt(rng, 100000000, 999999999)}`,
      },
      select: { id: true, email: true, phone: true },
    });

    const commission = pick(rng, [6, 8, 10, 12, 15]);
    const shopName = `${pick(rng, shopAdjectives)} ${pick(rng, shopNouns)}`;

    const v = await prisma.vendor.create({
      data: {
        userId: u.id,
        shopName,
        logoUrl: brandLogos[i % brandLogos.length]!,
        status: "APPROVED",
        commission,
        pickupName: `${fn} ${ln}`,
        pickupPhone: u.phone,
        pickupAddress1: `${randInt(rng, 1, 200)} Artisan Street`,
        pickupCity: pick(rng, ["Jaipur", "Delhi", "Mumbai", "Kolkata", "Bengaluru", "Chennai"]),
        pickupState: pick(rng, ["RJ", "DL", "MH", "WB", "KA", "TN"]),
        pickupPincode: String(randInt(rng, 110001, 560099)),
      },
      select: { id: true, commission: true, userId: true, shopName: true },
    });

    vendorUsers.push(u);
    vendors.push(v);
  }

  // Commission plan (default + a few vendor overrides)
  const defaultCommissionPercent = 10;
  await prisma.commissionPlan.create({
    data: {
      scope: "DEFAULT",
      percent: defaultCommissionPercent,
      isActive: true,
      note: "Seed default commission",
      createdBy: admin.id,
    },
  });

  for (let i = 0; i < Math.min(3, vendors.length); i++) {
    const v = vendors[i]!;
    await prisma.commissionPlan.create({
      data: {
        scope: "VENDOR",
        vendorId: v.id,
        percent: pick(rng, [8, 9, 12]),
        isActive: true,
        note: "Seed vendor override",
        createdBy: admin.id,
      },
    });
  }

  // Vendor KYC + bank (verified for seeded vendors)
  for (let i = 0; i < vendors.length; i++) {
    const v = vendors[i]!;

    await prisma.vendorBankAccount.create({
      data: {
        vendorId: v.id,
        accountName: `Vendor ${i + 1}`,
        accountNumber: `000${randInt(rng, 10000000, 99999999)}`,
        ifsc: "HDFC0001234",
        bankName: "HDFC Bank",
        upiId: maybe(rng, 0.4) ? `vendor${i + 1}@upi` : null,
      },
    });

    await prisma.vendorKyc.create({
      data: {
        vendorId: v.id,
        status: "VERIFIED",
        kycType: maybe(rng, 0.7) ? "INDIVIDUAL" : "BUSINESS",
        fullName: `Vendor ${i + 1}`,
        businessName: null,
        panNumber: `ABCDE${randInt(rng, 1000, 9999)}F`,
        gstin: maybe(rng, 0.5) ? `27ABCDE${randInt(rng, 1000, 9999)}F1Z5` : null,
        aadhaarLast4: maybe(rng, 0.6) ? String(randInt(rng, 1000, 9999)) : null,
        panImageUrl: brandLogos[i % brandLogos.length]!,
        gstCertificateUrl: maybe(rng, 0.5) ? brandLogos[(i + 1) % brandLogos.length]! : null,
        cancelledChequeUrl: brandLogos[(i + 2) % brandLogos.length]!,
        addressProofUrl: brandLogos[(i + 3) % brandLogos.length]!,
        submittedAt: isoDateDaysAgo(randInt(rng, 5, 30)),
        verifiedAt: isoDateDaysAgo(randInt(rng, 1, 4)),
      },
    });
  }

  const users = [] as Array<{ id: string; email: string; name: string | null }>;
  for (let i = 0; i < userCount; i++) {
    const fn = pick(rng, firstNames);
    const ln = pick(rng, lastNames);
    const email = `user${i + 1}@bohosaaz.test`;

    users.push(
      await prisma.user.create({
        data: {
          name: `${fn} ${ln}`,
          email,
          password: passwordHash,
          role: "USER",
          phone: `9${randInt(rng, 100000000, 999999999)}`,
        },
        select: { id: true, email: true, name: true },
      })
    );
  }

  // Wallet accounts
  const platformWallet = await getOrCreatePlatformWallet();
  for (const u of users) {
    await getOrCreateUserWallet(u.id);
  }
  for (const v of vendors) {
    await getOrCreateVendorWallet(v.id);
  }

  // Seed topups for most users
  for (let i = 0; i < users.length; i++) {
    const u = users[i]!;
    if (!maybe(rng, 0.75)) continue;

    const wallet = await getOrCreateUserWallet(u.id);
    const amountRupees = pick(rng, [500, 1000, 2000, 5000, 10000]);
    const amountPaise = rupeesToPaiseBig(amountRupees);

    const razorpayOrderId = `rzp_order_seed_${seed}_${i}_${Date.now()}`;
    const razorpayPaymentId = `rzp_pay_seed_${seed}_${i}_${Date.now()}`;

    await prisma.razorpayTopup.create({
      data: {
        walletId: wallet.id,
        userId: u.id,
        amountPaise,
        status: "PAID",
        razorpayOrderId,
        razorpayPaymentId,
      },
    });

    await postWalletTxn({
      walletId: wallet.id,
      type: "TOPUP",
      direction: "CREDIT",
      amountPaise,
      idempotencyKey: `TOPUP:${razorpayOrderId}`,
      razorpayOrderId,
      razorpayPaymentId,
      note: "Seed topup",
    });
  }

  // Products
  const imageUrls = ["/s1.jpg", "/s2.jpg", "/s3.jpg", "/s4.jpg", "/s5.jpg", "/s6.jpg", "/s7.jpg"];
  const productAdjectives = ["Handwoven", "Block-Printed", "Embroidered", "Minimal", "Festive", "Classic", "Artisan", "Vintage", "Premium", "Soft"];
  const productNouns = ["Saree", "Kurta", "Necklace", "Cushion Cover", "Tote Bag", "Jutti", "Shawl", "Gift Set", "Skincare Kit", "Wall Art"];

  const usedProductSlugs = new Set<string>();
  const products = [] as Array<{ id: string; vendorId: string; price: number; salePrice: number | null; title: string }>;

  const productsPerVendor = 20;
  for (const vendor of vendors) {
    for (let j = 0; j < productsPerVendor; j++) {
      const title = `${pick(rng, productAdjectives)} ${pick(rng, productNouns)} ${randInt(rng, 100, 999)}`;
      const baseSlug = slugify(`${title}-${vendor.id.slice(0, 6)}`);
      let slug = baseSlug;
      let k = 2;
      while (usedProductSlugs.has(slug)) {
        slug = `${baseSlug}-${k++}`;
      }
      usedProductSlugs.add(slug);

      const cat = pick(rng, categories);
      const basePrice = randInt(rng, 299, 3999);
      const hasSale = maybe(rng, 0.35);

      // Some products are simple (no variants) so we can seed INR+USD pricing.
      const willHaveVariants = maybe(rng, 0.7);

      const sizes = ["S", "M", "L", "XL"];
      const colors = ["Red", "Blue", "Green", "Black", "White", "Maroon", "Mustard"];

      const variantCount = willHaveVariants ? randInt(rng, 2, 4) : 0;
      const variants = [] as Array<{ productId: string; size: string; color: string; sku: string; price: number; salePrice: number | null; stock: number; isActive: boolean }>;
      for (let vi = 0; vi < variantCount; vi++) {
        const size = pick(rng, sizes);
        const color = pick(rng, colors);
        const vPrice = basePrice + randInt(rng, -50, 200);
        const vSale = hasSale && maybe(rng, 0.7) ? +(vPrice * 0.9).toFixed(2) : null;
        variants.push({
          productId: "__TBD__",
          size,
          color,
          sku: `V-__TBD__-${vi + 1}`,
          price: vPrice,
          salePrice: vSale,
          stock: randInt(rng, 2, 40),
          isActive: true,
        });
      }

      const stock = willHaveVariants
        ? variants.filter((v) => v.isActive).reduce((sum, v) => sum + v.stock, 0)
        : randInt(rng, 5, 80);

      const currency = "INR" as const;

      const price = willHaveVariants
        ? Math.min(...variants.map((v) => v.price))
        : basePrice;

      const salePrice = willHaveVariants
        ? (() => {
            const sales = variants
              .map((v) => v.salePrice)
              .filter((p): p is number => typeof p === "number" && Number.isFinite(p));
            return sales.length ? Math.min(...sales) : null;
          })()
        : (hasSale ? +(basePrice * pick(rng, [0.85, 0.8, 0.75, 0.9])).toFixed(2) : null);

      const mrp = willHaveVariants
        ? null
        : +Math.max(price * 1.12, price + randInt(rng, 50, 400)).toFixed(2);

      // logistics
      const length = maybe(rng, 0.7) ? +randInt(rng, 8, 60) : null;
      const width = length != null ? +randInt(rng, 8, 60) : null;
      const height = length != null ? +randInt(rng, 2, 25) : null;

      const material = pick(rng, ["Cotton", "Silk", "Linen", "Brass", "Silver Plated", "Jute", "Wool"]);
      const countryOfOrigin = pick(rng, ["India", "India", "India", "Nepal", "Bangladesh"]);
      const warranty = maybe(rng, 0.35) ? pick(rng, ["7 days", "15 days", "6 months"]) : null;
      const returnPolicy = pick(rng, [
        "7-day returns. Item must be unused with original packaging.",
        "No returns on customized items. Exchanges within 7 days if damaged.",
        "Returns accepted within 10 days. Refund after quality check.",
      ]);

      const p = await prisma.product.create({
        data: {
          vendorId: vendor.id,
          categoryId: cat.id,
          title,
          slug,
          shortDescription: `${material} • ${countryOfOrigin} • Hand-finished by artisans.`,
          description: "Seed product description (rich text supported).",

          currency,
          mrp,
          price,
          salePrice,

          sku: willHaveVariants ? null : `SKU-${vendor.id.slice(0, 4)}-${j + 1}`,
          barcode: `89${randInt(rng, 10000000000, 99999999999)}`,

          stock,
          isActive: true,

          material,
          weight: maybe(rng, 0.6) ? +randInt(rng, 100, 1800) / 10 : null,
          length,
          width,
          height,
          dimensions: length != null ? { length, width, height, unit: "cm" } : undefined,
          shippingClass: pick(rng, ["standard", "fragile", "heavy", "light"]),

          countryOfOrigin,
          warranty,
          returnPolicy,

          metaTitle: `${title} | Bohosaaz`,
          metaDescription: `Shop ${title}. ${material}. Fast delivery across India.`,
          metaKeywords: [material.toLowerCase(), "handmade", "artisan", cat.name.toLowerCase()].join(","),

          sizeOptions: sizes.join(","),
          colorOptions: colors.join(","),
        },
        select: { id: true, vendorId: true, price: true, salePrice: true, title: true },
      });

      products.push(p);

      // images (2-5, always one primary)
      const primaryIdx = randInt(rng, 0, imageUrls.length - 1);
      const imageCount = randInt(rng, 2, 5);
      const imageData = [] as Array<{ productId: string; url: string; isPrimary: boolean }>;
      imageData.push({ productId: p.id, url: imageUrls[primaryIdx]!, isPrimary: true });
      while (imageData.length < imageCount) {
        imageData.push({ productId: p.id, url: pick(rng, imageUrls), isPrimary: false });
      }
      await prisma.productImage.createMany({ data: imageData });

      // variants
      if (willHaveVariants && variants.length) {
        await prisma.productVariant.createMany({
          data: variants.map((v, idx) => ({
            ...v,
            productId: p.id,
            sku: `V-${p.id.slice(0, 6)}-${idx + 1}`,
          })),
        });
      }

      // tags (1-3)
      const tagCount = randInt(rng, 1, 3);
      const chosen = new Set<string>();
      while (chosen.size < tagCount) chosen.add(pick(rng, tags).id);
      await prisma.productTag.createMany({
        data: Array.from(chosen).map((tagId) => ({ productId: p.id, tagId })),
        skipDuplicates: true,
      });
    }
  }

  // Banners
  await prisma.banner.createMany({
    data: [
      {
        title: "Winter Edit",
        subtitle: "New season artisan picks",
        imageUrl: "/s6.jpg",
        ctaHref: "/en",
        isActive: true,
        sortOrder: 1,
      },
      {
        title: "Festive Finds",
        subtitle: "Handcrafted gifts",
        imageUrl: "/s7.jpg",
        ctaHref: "/en",
        isActive: true,
        sortOrder: 2,
      },
    ],
  });

  // Orders (including wallet payments)
  const ordersToCreate = 120;

  // Preload variants for cheaper selection
  const allVariants = await prisma.productVariant.findMany({
    select: { id: true, productId: true, sku: true, size: true, color: true, price: true, salePrice: true, stock: true, isActive: true },
  });

  const productsById = new Map(products.map((p) => [p.id, p] as const));
  const variantsByProductId = new Map<string, typeof allVariants>();
  for (const v of allVariants) {
    if (!variantsByProductId.has(v.productId)) variantsByProductId.set(v.productId, []);
    variantsByProductId.get(v.productId)!.push(v);
  }

  const settledVendorOrders: Array<{ vendorOrderId: string; vendorId: string; payoutRupees: number; commissionRupees: number }> = [];

  for (let oi = 0; oi < ordersToCreate; oi++) {
    const user = pick(rng, users);

    const itemCount = randInt(rng, 1, 5);
    const chosenProducts = new Set<string>();
    while (chosenProducts.size < itemCount) chosenProducts.add(pick(rng, products).id);

    const itemsInput = Array.from(chosenProducts).map((productId) => {
      const p = productsById.get(productId)!;
      const useVariant = maybe(rng, 0.8);
      const vars = variantsByProductId.get(productId) ?? [];
      const v = useVariant && vars.length ? pick(rng, vars) : null;

      const unit = v
        ? Number(v.salePrice ?? v.price)
        : Number(p.salePrice ?? p.price);
      const qty = randInt(rng, 1, 3);
      return {
        productId,
        vendorId: p.vendorId,
        variantId: v?.id ?? null,
        unitPrice: unit,
        quantity: qty,
        variantSku: v?.sku ?? null,
        variantSize: v?.size ?? null,
        variantColor: v?.color ?? null,
      };
    });

    const perVendor = new Map<string, { subtotal: number; itemIndexes: number[]; commissionPct: number }>();
    for (let ii = 0; ii < itemsInput.length; ii++) {
      const it = itemsInput[ii]!;
      const vendor = vendors.find((v) => v.id === it.vendorId)!;
      if (!perVendor.has(it.vendorId)) perVendor.set(it.vendorId, { subtotal: 0, itemIndexes: [], commissionPct: vendor.commission });
      const agg = perVendor.get(it.vendorId)!;
      agg.subtotal += it.unitPrice * it.quantity;
      agg.itemIndexes.push(ii);
    }

    const total = itemsInput.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);

    const isWallet = maybe(rng, 0.55);
    const baseStatus = maybe(rng, 0.4) ? "DELIVERED" : "PLACED";

    const createdAt = isoDateDaysAgo(randInt(rng, 0, 30));

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        status: baseStatus,
        total: +total.toFixed(2),
        paymentMethod: isWallet ? "WALLET" : "COD",
        fullName: user.name || "Customer",
        phone: `9${randInt(rng, 100000000, 999999999)}`,
        address1: `${randInt(rng, 1, 200)} Seed Street`,
        address2: maybe(rng, 0.35) ? "Near Seed Market" : null,
        city: pick(rng, ["Jaipur", "Delhi", "Mumbai", "Kolkata", "Bengaluru", "Chennai"]),
        state: pick(rng, ["RJ", "DL", "MH", "WB", "KA", "TN"]),
        pincode: String(randInt(rng, 110001, 560099)),
        createdAt,
      },
      select: { id: true, userId: true, total: true },
    });

    const vendorOrderByVendorId = new Map<string, { id: string; vendorId: string; payout: number; commission: number }>();
    for (const [vendorId, agg] of perVendor.entries()) {
      const rate = agg.commissionPct > 1 ? agg.commissionPct / 100 : agg.commissionPct;
      const commission = +(agg.subtotal * rate).toFixed(2);
      const payout = +(agg.subtotal - commission).toFixed(2);

      const status = baseStatus === "DELIVERED" ? (maybe(rng, 0.7) ? "SETTLED" : "DELIVERED") : "PLACED";

      const vo = await prisma.vendorOrder.create({
        data: {
          orderId: order.id,
          vendorId,
          status,
          subtotal: +agg.subtotal.toFixed(2),
          commission,
          payout,
          createdAt,
        },
        select: { id: true, vendorId: true, payout: true, commission: true, status: true },
      });

      await prisma.commissionHistory.create({
        data: {
          vendorId,
          vendorOrderId: vo.id,
          planId: null,
          commissionPercent: agg.commissionPct,
          baseAmountPaise: rupeesToPaiseBig(agg.subtotal),
          commissionPaise: rupeesToPaiseBig(commission),
          createdAt,
        },
      });

      vendorOrderByVendorId.set(vendorId, { id: vo.id, vendorId: vo.vendorId, payout: vo.payout, commission: vo.commission });

      if (status === "SETTLED") {
        settledVendorOrders.push({ vendorOrderId: vo.id, vendorId, payoutRupees: vo.payout, commissionRupees: vo.commission });
      }
    }

    // order items
    for (const it of itemsInput) {
      const vo = vendorOrderByVendorId.get(it.vendorId)!;

      const deliveredAt = baseStatus === "DELIVERED" ? isoDateDaysAgo(randInt(rng, 0, 25)) : null;
      const status = baseStatus === "DELIVERED" ? "DELIVERED" : "PLACED";

      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: it.productId,
          variantId: it.variantId,
          vendorOrderId: vo.id,
          quantity: it.quantity,
          price: +it.unitPrice.toFixed(2),
          variantSku: it.variantSku,
          variantSize: it.variantSize,
          variantColor: it.variantColor,
          status,
          deliveredAt,
          createdAt,
        },
      });
    }

    // Wallet posting (debit user, credit platform)
    if (isWallet) {
      const userWallet = await getOrCreateUserWallet(order.userId);
      const totalPaise = rupeesToPaiseBig(order.total);

      const bal = await prisma.walletAccount.findUnique({
        where: { id: userWallet.id },
        select: { balancePaise: true },
      });

      const current = bal?.balancePaise ?? BigInt(0);
      if (current < totalPaise) {
        const buffer = rupeesToPaiseBig(500);
        const needed = totalPaise - current + buffer;

        await postWalletTxn({
          walletId: userWallet.id,
          type: "ADJUSTMENT",
          direction: "CREDIT",
          amountPaise: needed,
          idempotencyKey: `SEED:WALLET:ADJUST:${order.id}`,
          orderId: order.id,
          note: "Seed wallet adjustment",
        });
      }

      await postWalletTxn({
        walletId: userWallet.id,
        type: "ORDER_PAYMENT",
        direction: "DEBIT",
        amountPaise: totalPaise,
        idempotencyKey: `ORDERPAY:USER:${order.id}`,
        orderId: order.id,
        note: "Seed wallet checkout",
      });

      await postWalletTxn({
        walletId: platformWallet.id,
        type: "ORDER_PAYMENT",
        direction: "CREDIT",
        amountPaise: totalPaise,
        idempotencyKey: `ORDERPAY:PLATFORM:${order.id}`,
        orderId: order.id,
        note: "Seed wallet checkout",
      });
    }
  }

  // Payout records for settled vendor orders + wallet postings
  for (const vo of settledVendorOrders) {
    const payoutPaise = rupeesToPaiseBig(vo.payoutRupees);
    const commissionPaise = rupeesToPaiseBig(vo.commissionRupees);

    const payout = await prisma.payout.create({
      data: {
        vendorId: vo.vendorId,
        vendorOrderId: vo.vendorOrderId,
        amountPaise: payoutPaise,
        commissionPaise,
        status: "SETTLED",
        settledAt: new Date(),
      },
      select: { id: true },
    });

    const vendorWallet = await getOrCreateVendorWallet(vo.vendorId);

    await postWalletTxn({
      walletId: vendorWallet.id,
      type: "PAYOUT",
      direction: "CREDIT",
      amountPaise: payoutPaise,
      idempotencyKey: `PAYOUT:VENDORORDER:${vo.vendorOrderId}:VENDOR`,
      vendorOrderId: vo.vendorOrderId,
      payoutId: payout.id,
      note: "Seed payout",
    });

    await postWalletTxn({
      walletId: platformWallet.id,
      type: "PAYOUT",
      direction: "DEBIT",
      amountPaise: payoutPaise,
      idempotencyKey: `PAYOUT:VENDORORDER:${vo.vendorOrderId}:PLATFORM`,
      vendorOrderId: vo.vendorOrderId,
      payoutId: payout.id,
      note: "Seed payout",
    });
  }

  // Refunds (a few items)
  const refundable = await prisma.orderItem.findMany({
    where: { status: "DELIVERED" },
    take: 20,
    include: { order: true },
  });

  for (let i = 0; i < refundable.length; i++) {
    const it = refundable[i]!;
    if (!maybe(rng, 0.35)) continue;

    await prisma.orderItem.update({
      where: { id: it.id },
      data: {
        status: "REFUNDED",
        updatedAt: new Date(),
      },
    });

    const refundPaise = rupeesToPaiseBig(it.price * it.quantity);
    const userWallet = await getOrCreateUserWallet(it.order.userId);

    await postWalletTxn({
      walletId: userWallet.id,
      type: "REFUND",
      direction: "CREDIT",
      amountPaise: refundPaise,
      idempotencyKey: `REFUND:ITEM:${it.id}:USER`,
      orderId: it.orderId,
      vendorOrderId: it.vendorOrderId ?? undefined,
      note: "Seed refund",
    });

    await postWalletTxn({
      walletId: platformWallet.id,
      type: "REFUND",
      direction: "DEBIT",
      amountPaise: refundPaise,
      idempotencyKey: `REFUND:ITEM:${it.id}:PLATFORM`,
      orderId: it.orderId,
      vendorOrderId: it.vendorOrderId ?? undefined,
      note: "Seed refund",
    });
  }

  // A few support tickets for realism
  const someOrders = await prisma.order.findMany({ take: 10, select: { id: true, userId: true } });
  for (let i = 0; i < someOrders.length; i++) {
    const o = someOrders[i]!;
    const vendor = pick(rng, vendors);

    const ticket = await prisma.supportTicket.create({
      data: {
        vendorId: vendor.id,
        createdBy: o.userId,
        category: pick(rng, ["ORDER_ISSUE", "PAYOUT_ISSUE", "RETURNS_ISSUE", "OTHER"]),
        subject: `Seed ticket #${i + 1}`,
        status: pick(rng, ["OPEN", "IN_PROGRESS", "RESOLVED"]),
        meta: { orderId: o.id },
        orderId: o.id,
      },
      select: { id: true },
    });

    await prisma.supportTicketMessage.createMany({
      data: [
        {
          ticketId: ticket.id,
          senderId: o.userId,
          senderRole: "USER",
          message: "Hi, I have a question about my order.",
          isInternal: false,
        },
        {
          ticketId: ticket.id,
          senderId: vendor.userId,
          senderRole: "VENDOR",
          message: "Thanks for reaching out. We are looking into it.",
          isInternal: false,
        },
      ],
    });
  }

  // ✅ Coupons (BOHO40)
  await prisma.coupon.upsert({
    where: { code: "BOHO40" },
    update: {
      type: "PERCENT",
      value: 40,
      minOrderAmount: 999,
      maxDiscountAmount: 2500,
      startAt: isoDateDaysAgo(2),
      endAt: isoDateDaysAgo(-14),
      usageLimit: 500,
      isActive: true,
    },
    create: {
      code: "BOHO40",
      type: "PERCENT",
      value: 40,
      minOrderAmount: 999,
      maxDiscountAmount: 2500,
      startAt: isoDateDaysAgo(2),
      endAt: isoDateDaysAgo(-14),
      usageLimit: 500,
      isActive: true,
    },
  });

  // ✅ Admin-managed CMS pages (ContentPage)
  await prisma.contentPage.createMany({
    data: [
      {
        slug: "about",
        title: "About",
        body: "# About Bohosaaz\n\nBohosaaz is a multi-vendor marketplace for authentic handcrafted goods — curated for premium taste, crafted to last.",
      },
      {
        slug: "terms",
        title: "Terms & Conditions",
        body: "# Terms & Conditions\n\nBy using Bohosaaz, you agree to our platform policies. Vendors must provide accurate product details and fulfill orders on time.",
      },
      {
        slug: "privacy",
        title: "Privacy Policy",
        body: "# Privacy Policy\n\nWe collect basic information to process orders and provide support. We do not sell personal data.",
      },
      {
        slug: "contact",
        title: "Contact",
        body: "Need help with an order or want to partner as a seller? Send us a message using the form below.",
      },
    ],
    skipDuplicates: true,
  });

  // ✅ Sample blog posts
  const now = new Date();
  await prisma.blogPost.createMany({
    data: [
      {
        slug: "welcome-to-bohosaaz",
        title: "Welcome to Bohosaaz",
        excerpt: "A premium marketplace for handcrafted goods.",
        body: "# Welcome\n\nDiscover artisan-made pieces with transparent pricing and trusted sellers.",
        coverImageUrl: null,
        isPublished: true,
        publishedAt: now,
      },
      {
        slug: "craft-first-quality",
        title: "Craft-first quality",
        excerpt: "How we curate sellers and products.",
        body: "## Our curation\n\nWe prioritize authentic handmade products and small-batch production.",
        coverImageUrl: null,
        isPublished: true,
        publishedAt: now,
      },
      {
        slug: "behind-the-scenes",
        title: "Behind the scenes",
        excerpt: "A look at how orders flow across vendors.",
        body: "## Order flow\n\nOrders are fulfilled vendor-wise with clear tracking and payouts.",
        coverImageUrl: null,
        isPublished: false,
        publishedAt: null,
      },
    ],
    skipDuplicates: true,
  });

  // ✅ Sample contact messages
  await prisma.contactMessage.createMany({
    data: [
      {
        name: "Demo User",
        email: "demo.user@bohosaaz.test",
        subject: "Shipping question",
        message: "Hi, how long does delivery usually take?",
        status: "NEW",
      },
      {
        name: "Vendor Inquiry",
        email: "vendor.inquiry@bohosaaz.test",
        subject: "Interested in selling",
        message: "I want to sell handcrafted products. What is the process?",
        status: "REPLIED",
        adminReply: "Thanks for reaching out! Please apply via the Seller page and we will review your details.",
        repliedAt: now,
      },
    ],
  });

  console.log("✅ Seed complete");
  console.log("Admin login:");
  console.log("  email:", adminEmail);
  console.log("  password:", adminPassword);
  console.log("Vendor login sample:");
  console.log("  email:", vendorUsers[0]?.email);
  console.log("  password: User@12345");
  console.log("User login sample:");
  console.log("  email:", users[0]?.email);
  console.log("  password: User@12345");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
