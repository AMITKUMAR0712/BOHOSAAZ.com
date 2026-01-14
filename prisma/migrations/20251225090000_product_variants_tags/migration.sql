-- Product advanced attributes
ALTER TABLE `Product`
  ADD COLUMN `material` VARCHAR(191) NULL,
  ADD COLUMN `weight` DOUBLE NULL,
  ADD COLUMN `dimensions` JSON NULL,
  ADD COLUMN `shippingClass` VARCHAR(191) NULL;

-- ProductVariant
CREATE TABLE `ProductVariant` (
  `id` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `size` VARCHAR(191) NOT NULL,
  `color` VARCHAR(191) NULL,
  `sku` VARCHAR(191) NOT NULL,
  `price` DOUBLE NOT NULL,
  `salePrice` DOUBLE NULL,
  `stock` INT NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ProductVariant_productId_sku_key` (`productId`, `sku`),
  INDEX `ProductVariant_productId_idx` (`productId`),
  INDEX `ProductVariant_size_idx` (`size`),
  INDEX `ProductVariant_color_idx` (`color`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ProductVariant`
  ADD CONSTRAINT `ProductVariant_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Tag + ProductTag
CREATE TABLE `Tag` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `Tag_name_key` (`name`),
  UNIQUE INDEX `Tag_slug_key` (`slug`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProductTag` (
  `productId` VARCHAR(191) NOT NULL,
  `tagId` VARCHAR(191) NOT NULL,
  INDEX `ProductTag_tagId_idx` (`tagId`),
  PRIMARY KEY (`productId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ProductTag`
  ADD CONSTRAINT `ProductTag_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ProductTag_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- OrderItem variant support
ALTER TABLE `OrderItem`
  ADD COLUMN `variantId` VARCHAR(191) NULL,
  ADD COLUMN `variantSku` VARCHAR(191) NULL,
  ADD COLUMN `variantSize` VARCHAR(191) NULL,
  ADD COLUMN `variantColor` VARCHAR(191) NULL;

CREATE INDEX `OrderItem_variantId_idx` ON `OrderItem`(`variantId`);

ALTER TABLE `OrderItem`
  ADD CONSTRAINT `OrderItem_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
