import { prisma } from "@/lib/prisma";
type DbClient = {
  walletAccount: {
    upsert(args: unknown): Promise<{ id: string; kind: string; balancePaise: bigint }>;
    findUnique(args: unknown): Promise<{ id: string; kind: string; balancePaise: bigint } | null>;
    update(args: unknown): Promise<{ balancePaise: bigint }>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
  walletTransaction: {
    findUnique(args: unknown): Promise<unknown | null>;
    create(args: unknown): Promise<unknown>;
  };
  $transaction?<T>(fn: (db: DbClient) => Promise<T>): Promise<T>;
};

export type WalletTxnType = "TOPUP" | "ORDER_PAYMENT" | "REFUND" | "PAYOUT" | "COMMISSION" | "ADJUSTMENT";
export type WalletTxnDirection = "CREDIT" | "DEBIT";
export type WalletTxnStatus = "PENDING" | "POSTED" | "FAILED";

export class WalletError extends Error {
  code: "INSUFFICIENT_FUNDS" | "NOT_FOUND" | "INVALID";

  constructor(code: WalletError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export async function getOrCreateUserWallet(userId: string) {
  return getOrCreateUserWalletTx(prisma as unknown as DbClient, userId);
}

export async function getOrCreateUserWalletTx(db: DbClient, userId: string) {
  return db.walletAccount.upsert({
    where: { userId },
    update: {},
    create: {
      kind: "USER",
      userId,
      balancePaise: BigInt(0),
    },
  });
}

export async function getOrCreateVendorWallet(vendorId: string) {
  return getOrCreateVendorWalletTx(prisma as unknown as DbClient, vendorId);
}

export async function getOrCreateVendorWalletTx(db: DbClient, vendorId: string) {
  return db.walletAccount.upsert({
    where: { vendorId },
    update: {},
    create: {
      kind: "VENDOR",
      vendorId,
      balancePaise: BigInt(0),
    },
  });
}

export async function getOrCreatePlatformWallet() {
  return getOrCreatePlatformWalletTx(prisma as unknown as DbClient);
}

export async function getOrCreatePlatformWalletTx(db: DbClient) {
  return db.walletAccount.upsert({
    where: { platformKey: "PLATFORM" },
    update: {},
    create: {
      kind: "PLATFORM",
      platformKey: "PLATFORM",
      balancePaise: BigInt(0),
    },
  });
}

export async function postWalletTxn({
  tx,
  walletId,
  type,
  direction,
  amountPaise,
  idempotencyKey,
  status = "POSTED",
  note,
  meta,
  orderId,
  vendorOrderId,
  payoutId,
  razorpayOrderId,
  razorpayPaymentId,
}: {
  tx?: DbClient;
  walletId: string;
  type: WalletTxnType;
  direction: WalletTxnDirection;
  amountPaise: bigint;
  idempotencyKey?: string;
  status?: WalletTxnStatus;
  note?: string;
  meta?: unknown;
  orderId?: string;
  vendorOrderId?: string;
  payoutId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
}) {
  if (amountPaise <= BigInt(0)) throw new WalletError("INVALID", "Amount must be positive");

  const run = async (db: DbClient) => {
    if (idempotencyKey) {
      const existing = await db.walletTransaction.findUnique({
        where: { idempotencyKey },
      });
      if (existing) return existing;
    }

    const wallet = await db.walletAccount.findUnique({
      where: { id: walletId },
      select: { id: true, kind: true, balancePaise: true },
    });
    if (!wallet) throw new WalletError("NOT_FOUND", "Wallet not found");

    const allowNegative = wallet.kind === "PLATFORM";

    let updated: { balancePaise: bigint };

    if (direction === "CREDIT") {
      updated = await db.walletAccount.update({
        where: { id: walletId },
        data: { balancePaise: { increment: amountPaise } },
        select: { balancePaise: true },
      });
    } else {
      if (allowNegative) {
        updated = await db.walletAccount.update({
          where: { id: walletId },
          data: { balancePaise: { decrement: amountPaise } },
          select: { balancePaise: true },
        });
      } else {
        const res = await db.walletAccount.updateMany({
          where: { id: walletId, balancePaise: { gte: amountPaise } },
          data: { balancePaise: { decrement: amountPaise } },
        });
        if (res.count !== 1) throw new WalletError("INSUFFICIENT_FUNDS", "Insufficient wallet balance");
        updated = (await db.walletAccount.findUnique({
          where: { id: walletId },
          select: { balancePaise: true },
        }))!;
      }
    }

    const created = await db.walletTransaction.create({
      data: {
        idempotencyKey,
        walletId,
        type,
        direction,
        status,
        amountPaise,
        balanceAfterPaise: updated.balancePaise,
        note,
        meta,
        orderId,
        vendorOrderId,
        payoutId,
        razorpayOrderId,
        razorpayPaymentId,
      },
    });

    return created;
  };

  if (tx) return run(tx);
  const db = prisma as unknown as DbClient;
  if (!db.$transaction) throw new Error("Prisma transaction API unavailable");
  return db.$transaction(run);
}
