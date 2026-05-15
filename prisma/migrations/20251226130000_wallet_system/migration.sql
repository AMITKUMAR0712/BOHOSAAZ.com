-- AlterTable
ALTER TABLE `Order` ADD COLUMN `paymentMethod` ENUM('COD', 'WALLET', 'RAZORPAY') NOT NULL DEFAULT 'COD';

-- CreateTable
CREATE TABLE `WalletAccount` (
    `id` VARCHAR(191) NOT NULL,
    `kind` ENUM('USER', 'VENDOR', 'PLATFORM') NOT NULL,
    `platformKey` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `vendorId` VARCHAR(191) NULL,
    `balancePaise` BIGINT NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WalletAccount_platformKey_key`(`platformKey`),
    UNIQUE INDEX `WalletAccount_userId_key`(`userId`),
    UNIQUE INDEX `WalletAccount_vendorId_key`(`vendorId`),
    INDEX `WalletAccount_kind_idx`(`kind`),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WalletTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `idempotencyKey` VARCHAR(191) NULL,
    `walletId` VARCHAR(191) NOT NULL,
    `type` ENUM('TOPUP', 'ORDER_PAYMENT', 'REFUND', 'PAYOUT', 'COMMISSION', 'ADJUSTMENT') NOT NULL,
    `direction` ENUM('CREDIT', 'DEBIT') NOT NULL,
    `status` ENUM('PENDING', 'POSTED', 'FAILED') NOT NULL DEFAULT 'POSTED',
    `amountPaise` BIGINT NOT NULL,
    `balanceAfterPaise` BIGINT NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `note` VARCHAR(191) NULL,
    `meta` JSON NULL,
    `orderId` VARCHAR(191) NULL,
    `vendorOrderId` VARCHAR(191) NULL,
    `payoutId` VARCHAR(191) NULL,
    `razorpayOrderId` VARCHAR(191) NULL,
    `razorpayPaymentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `WalletTransaction_idempotencyKey_key`(`idempotencyKey`),
    INDEX `WalletTransaction_walletId_createdAt_idx`(`walletId`, `createdAt`),
    INDEX `WalletTransaction_type_idx`(`type`),
    INDEX `WalletTransaction_orderId_idx`(`orderId`),
    INDEX `WalletTransaction_vendorOrderId_idx`(`vendorOrderId`),
    INDEX `WalletTransaction_payoutId_idx`(`payoutId`),
    INDEX `WalletTransaction_razorpayOrderId_idx`(`razorpayOrderId`),
    INDEX `WalletTransaction_razorpayPaymentId_idx`(`razorpayPaymentId`),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RazorpayTopup` (
    `id` VARCHAR(191) NOT NULL,
    `walletId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `amountPaise` BIGINT NOT NULL,
    `status` ENUM('CREATED', 'PAID', 'FAILED') NOT NULL DEFAULT 'CREATED',
    `razorpayOrderId` VARCHAR(191) NOT NULL,
    `razorpayPaymentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RazorpayTopup_razorpayOrderId_key`(`razorpayOrderId`),
    UNIQUE INDEX `RazorpayTopup_razorpayPaymentId_key`(`razorpayPaymentId`),
    INDEX `RazorpayTopup_userId_idx`(`userId`),
    INDEX `RazorpayTopup_walletId_idx`(`walletId`),
    INDEX `RazorpayTopup_status_idx`(`status`),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payout` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `vendorOrderId` VARCHAR(191) NOT NULL,
    `amountPaise` BIGINT NOT NULL,
    `commissionPaise` BIGINT NOT NULL,
    `status` ENUM('PENDING', 'HELD', 'SETTLED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `settledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Payout_vendorOrderId_key`(`vendorOrderId`),
    INDEX `Payout_vendorId_idx`(`vendorId`),
    INDEX `Payout_status_idx`(`status`),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WalletAccount` ADD CONSTRAINT `WalletAccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WalletAccount` ADD CONSTRAINT `WalletAccount_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WalletTransaction` ADD CONSTRAINT `WalletTransaction_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `WalletAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WalletTransaction` ADD CONSTRAINT `WalletTransaction_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WalletTransaction` ADD CONSTRAINT `WalletTransaction_vendorOrderId_fkey` FOREIGN KEY (`vendorOrderId`) REFERENCES `VendorOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WalletTransaction` ADD CONSTRAINT `WalletTransaction_payoutId_fkey` FOREIGN KEY (`payoutId`) REFERENCES `Payout`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RazorpayTopup` ADD CONSTRAINT `RazorpayTopup_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `WalletAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RazorpayTopup` ADD CONSTRAINT `RazorpayTopup_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payout` ADD CONSTRAINT `Payout_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payout` ADD CONSTRAINT `Payout_vendorOrderId_fkey` FOREIGN KEY (`vendorOrderId`) REFERENCES `VendorOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
