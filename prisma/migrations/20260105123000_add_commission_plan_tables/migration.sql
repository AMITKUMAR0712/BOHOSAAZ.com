-- Add CommissionPlan + CommissionHistory (missing tables)

CREATE TABLE `CommissionPlan` (
  `id` VARCHAR(191) NOT NULL,
  `scope` ENUM('DEFAULT','VENDOR','CATEGORY') NOT NULL,
  `percent` DOUBLE NOT NULL,

  `vendorId` VARCHAR(191) NULL,
  `categoryId` VARCHAR(191) NULL,

  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `note` VARCHAR(191) NULL,
  `createdBy` VARCHAR(191) NULL,

  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `CommissionPlan_scope_vendorId_categoryId_key`(`scope`, `vendorId`, `categoryId`),
  INDEX `CommissionPlan_scope_idx`(`scope`),
  INDEX `CommissionPlan_vendorId_idx`(`vendorId`),
  INDEX `CommissionPlan_categoryId_idx`(`categoryId`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CommissionHistory` (
  `id` VARCHAR(191) NOT NULL,

  `vendorId` VARCHAR(191) NOT NULL,
  `vendorOrderId` VARCHAR(191) NOT NULL,
  `planId` VARCHAR(191) NULL,

  `commissionPercent` DOUBLE NOT NULL,
  `baseAmountPaise` BIGINT NOT NULL,
  `commissionPaise` BIGINT NOT NULL,

  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `CommissionHistory_vendorOrderId_key`(`vendorOrderId`),
  INDEX `CommissionHistory_vendorId_createdAt_idx`(`vendorId`, `createdAt`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CommissionPlan`
  ADD CONSTRAINT `CommissionPlan_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `CommissionPlan_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CommissionHistory`
  ADD CONSTRAINT `CommissionHistory_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `CommissionHistory_vendorOrderId_fkey` FOREIGN KEY (`vendorOrderId`) REFERENCES `VendorOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `CommissionHistory_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `CommissionPlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
