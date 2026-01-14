/*
  Warnings:

  - You are about to alter the column `highlightText` on the `banner` table. The data in that column could be lost. The data in that column will be cast from `VarChar(200)` to `VarChar(191)`.
  - You are about to alter the column `coverImageUrl` on the `blogpost` table. The data in that column could be lost. The data in that column will be cast from `VarChar(2048)` to `VarChar(191)`.
  - You are about to alter the column `status` on the `contactmessage` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(17))` to `Enum(EnumId(16))`.
  - You are about to drop the column `isHighlight` on the `coupon` table. All the data in the column will be lost.
  - You are about to drop the column `meta` on the `newslettersubscriber` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `banner` DROP FOREIGN KEY `Banner_couponCode_fkey`;

-- DropForeignKey
ALTER TABLE `coupon` DROP FOREIGN KEY `Coupon_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `coupon` DROP FOREIGN KEY `Coupon_productId_fkey`;

-- DropIndex
DROP INDEX `Coupon_isHighlight_idx` ON `coupon`;

-- DropIndex
DROP INDEX `Coupon_isHighlighted_idx` ON `coupon`;

-- DropIndex
DROP INDEX `NewsletterSubscriber_createdAt_idx` ON `newslettersubscriber`;

-- AlterTable
ALTER TABLE `banner` MODIFY `highlightText` VARCHAR(191) NULL,
    MODIFY `ctaText` VARCHAR(191) NULL,
    MODIFY `couponCode` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `blogpost` MODIFY `excerpt` VARCHAR(191) NOT NULL,
    MODIFY `body` VARCHAR(191) NOT NULL,
    MODIFY `coverImageUrl` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `contactmessage` MODIFY `message` VARCHAR(191) NOT NULL,
    MODIFY `status` ENUM('NEW', 'REPLIED', 'CLOSED') NOT NULL DEFAULT 'NEW',
    MODIFY `adminReply` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `contentpage` MODIFY `body` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `coupon` DROP COLUMN `isHighlight`;

-- AlterTable
ALTER TABLE `couponredemption` MODIFY `amountDiscounted` DOUBLE NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `newslettersubscriber` DROP COLUMN `meta`;

-- AlterTable
ALTER TABLE `payout` ADD COLUMN `externalRef` VARCHAR(191) NULL,
    ADD COLUMN `settledVia` ENUM('WALLET', 'EXTERNAL') NULL,
    ADD COLUMN `statusReason` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `product` ADD COLUMN `barcode` VARCHAR(191) NULL,
    ADD COLUMN `colorOptions` VARCHAR(191) NULL,
    ADD COLUMN `countryOfOrigin` VARCHAR(191) NULL,
    ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `height` DOUBLE NULL,
    ADD COLUMN `length` DOUBLE NULL,
    ADD COLUMN `metaDescription` VARCHAR(191) NULL,
    ADD COLUMN `metaKeywords` VARCHAR(191) NULL,
    ADD COLUMN `metaTitle` VARCHAR(191) NULL,
    ADD COLUMN `mrpInr` DOUBLE NULL,
    ADD COLUMN `mrpUsd` DOUBLE NULL,
    ADD COLUMN `returnPolicy` VARCHAR(191) NULL,
    ADD COLUMN `shortDescription` VARCHAR(191) NULL,
    ADD COLUMN `sizeOptions` VARCHAR(191) NULL,
    ADD COLUMN `warranty` VARCHAR(191) NULL,
    ADD COLUMN `width` DOUBLE NULL;

-- AlterTable
ALTER TABLE `returnrequest` ADD COLUMN `notes` VARCHAR(191) NULL,
    ADD COLUMN `pickupScheduledAt` DATETIME(3) NULL,
    MODIFY `status` ENUM('REQUESTED', 'APPROVED', 'REJECTED', 'PICKUP_SCHEDULED', 'PICKED', 'REFUNDED') NOT NULL DEFAULT 'REQUESTED';

-- AlterTable
ALTER TABLE `vendor` ADD COLUMN `shopAddress1` VARCHAR(191) NULL,
    ADD COLUMN `shopAddress2` VARCHAR(191) NULL,
    ADD COLUMN `shopCity` VARCHAR(191) NULL,
    ADD COLUMN `shopDescription` VARCHAR(191) NULL,
    ADD COLUMN `shopPincode` VARCHAR(191) NULL,
    ADD COLUMN `shopState` VARCHAR(191) NULL,
    ADD COLUMN `statusReason` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `VendorKyc` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `status` ENUM('NOT_SUBMITTED', 'SUBMITTED', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'NOT_SUBMITTED',
    `kycType` ENUM('INDIVIDUAL', 'BUSINESS') NOT NULL,
    `fullName` VARCHAR(191) NULL,
    `businessName` VARCHAR(191) NULL,
    `panNumber` VARCHAR(191) NOT NULL,
    `gstin` VARCHAR(191) NULL,
    `aadhaarLast4` VARCHAR(191) NULL,
    `panImageUrl` VARCHAR(191) NOT NULL,
    `gstCertificateUrl` VARCHAR(191) NULL,
    `cancelledChequeUrl` VARCHAR(191) NOT NULL,
    `addressProofUrl` VARCHAR(191) NOT NULL,
    `rejectionReason` VARCHAR(191) NULL,
    `submittedAt` DATETIME(3) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VendorKyc_vendorId_key`(`vendorId`),
    INDEX `VendorKyc_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VendorBankAccount` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `accountName` VARCHAR(191) NOT NULL,
    `accountNumber` VARCHAR(191) NOT NULL,
    `ifsc` VARCHAR(191) NOT NULL,
    `bankName` VARCHAR(191) NOT NULL,
    `upiId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VendorBankAccount_vendorId_key`(`vendorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReturnTrackingEvent` (
    `id` VARCHAR(191) NOT NULL,
    `returnRequestId` VARCHAR(191) NOT NULL,
    `status` ENUM('REQUESTED', 'APPROVED', 'REJECTED', 'PICKUP_SCHEDULED', 'PICKED', 'REFUNDED') NOT NULL,
    `note` VARCHAR(191) NULL,
    `actorId` VARCHAR(191) NULL,
    `actorRole` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ReturnTrackingEvent_returnRequestId_createdAt_idx`(`returnRequestId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefundRecord` (
    `id` VARCHAR(191) NOT NULL,
    `returnRequestId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` ENUM('PROCESSING', 'COMPLETED', 'FAILED') NOT NULL,
    `method` ENUM('COD', 'WALLET', 'RAZORPAY') NOT NULL,
    `amount` DOUBLE NOT NULL,
    `provider` VARCHAR(191) NULL,
    `providerRefundId` VARCHAR(191) NULL,
    `walletTxnId` VARCHAR(191) NULL,
    `meta` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RefundRecord_returnRequestId_key`(`returnRequestId`),
    UNIQUE INDEX `RefundRecord_walletTxnId_key`(`walletTxnId`),
    INDEX `RefundRecord_orderId_idx`(`orderId`),
    INDEX `RefundRecord_userId_idx`(`userId`),
    INDEX `RefundRecord_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Product_sku_idx` ON `Product`(`sku`);

-- CreateIndex
CREATE INDEX `Product_barcode_idx` ON `Product`(`barcode`);

-- CreateIndex
CREATE INDEX `Product_deletedAt_idx` ON `Product`(`deletedAt`);

-- AddForeignKey
ALTER TABLE `VendorKyc` ADD CONSTRAINT `VendorKyc_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VendorBankAccount` ADD CONSTRAINT `VendorBankAccount_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Banner` ADD CONSTRAINT `Banner_couponCode_fkey` FOREIGN KEY (`couponCode`) REFERENCES `Coupon`(`code`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnTrackingEvent` ADD CONSTRAINT `ReturnTrackingEvent_returnRequestId_fkey` FOREIGN KEY (`returnRequestId`) REFERENCES `ReturnRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefundRecord` ADD CONSTRAINT `RefundRecord_returnRequestId_fkey` FOREIGN KEY (`returnRequestId`) REFERENCES `ReturnRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefundRecord` ADD CONSTRAINT `RefundRecord_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefundRecord` ADD CONSTRAINT `RefundRecord_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefundRecord` ADD CONSTRAINT `RefundRecord_walletTxnId_fkey` FOREIGN KEY (`walletTxnId`) REFERENCES `WalletTransaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
