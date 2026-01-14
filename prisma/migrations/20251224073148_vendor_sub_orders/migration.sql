-- AlterTable
ALTER TABLE `orderitem` ADD COLUMN `vendorOrderId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `VendorOrder` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `status` ENUM('PLACED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'SETTLED') NOT NULL DEFAULT 'PLACED',
    `subtotal` DOUBLE NOT NULL,
    `commission` DOUBLE NOT NULL,
    `payout` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VendorOrder` ADD CONSTRAINT `VendorOrder_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VendorOrder` ADD CONSTRAINT `VendorOrder_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_vendorOrderId_fkey` FOREIGN KEY (`vendorOrderId`) REFERENCES `VendorOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
