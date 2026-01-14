-- Coupons/CMS/Blogs/Contact + order coupon totals
-- NOTE: MySQL + Prisma default table names (model names)

-- 1) Coupon: add startAt (endAt reuses existing expiresAt column via Prisma @map)
ALTER TABLE `Coupon`
  ADD COLUMN `startAt` DATETIME(3) NULL;

-- 2) Order: add subtotal + coupon fields
ALTER TABLE `Order`
  ADD COLUMN `subtotal` DOUBLE NOT NULL DEFAULT 0,
  ADD COLUMN `couponId` VARCHAR(191) NULL,
  ADD COLUMN `couponCode` VARCHAR(191) NULL,
  ADD COLUMN `couponDiscount` DOUBLE NOT NULL DEFAULT 0;

CREATE INDEX `Order_couponId_idx` ON `Order`(`couponId`);

ALTER TABLE `Order`
  ADD CONSTRAINT `Order_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupon`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 3) CouponRedemption: make userId optional, add email + amountDiscounted, add idempotency unique
ALTER TABLE `CouponRedemption`
  MODIFY `userId` VARCHAR(191) NULL,
  ADD COLUMN `email` VARCHAR(191) NULL,
  ADD COLUMN `amountDiscounted` DOUBLE NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX `CouponRedemption_couponId_orderId_key` ON `CouponRedemption`(`couponId`, `orderId`);

-- 4) ContentPage
CREATE TABLE `ContentPage` (
  `id` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `body` LONGTEXT NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `ContentPage_slug_key`(`slug`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 5) BlogPost
CREATE TABLE `BlogPost` (
  `id` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `excerpt` TEXT NOT NULL,
  `body` LONGTEXT NOT NULL,
  `coverImageUrl` VARCHAR(2048) NULL,
  `isPublished` BOOLEAN NOT NULL DEFAULT false,
  `publishedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `BlogPost_slug_key`(`slug`),
  INDEX `BlogPost_isPublished_idx`(`isPublished`),
  INDEX `BlogPost_publishedAt_idx`(`publishedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 6) ContactMessage
CREATE TABLE `ContactMessage` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `subject` VARCHAR(191) NOT NULL,
  `message` LONGTEXT NOT NULL,
  `status` ENUM('NEW','REPLIED','CLOSED') NOT NULL DEFAULT 'NEW',
  `adminReply` LONGTEXT NULL,
  `repliedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `ContactMessage_status_idx`(`status`),
  INDEX `ContactMessage_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
