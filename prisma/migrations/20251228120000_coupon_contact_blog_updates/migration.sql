-- Coupon/contact/blog updates

-- 1) Coupon: per-user limits, highlight coupon, and scoping
ALTER TABLE `Coupon`
  ADD COLUMN `perUserLimit` INT NULL,
  ADD COLUMN `isHighlight` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `appliesTo` ENUM('ALL','CATEGORY','PRODUCT') NOT NULL DEFAULT 'ALL',
  ADD COLUMN `categoryId` VARCHAR(191) NULL,
  ADD COLUMN `productId` VARCHAR(191) NULL;

CREATE INDEX `Coupon_isHighlight_idx` ON `Coupon`(`isHighlight`);
CREATE INDEX `Coupon_appliesTo_idx` ON `Coupon`(`appliesTo`);
CREATE INDEX `Coupon_categoryId_idx` ON `Coupon`(`categoryId`);
CREATE INDEX `Coupon_productId_idx` ON `Coupon`(`productId`);

ALTER TABLE `Coupon`
  ADD CONSTRAINT `Coupon_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Coupon_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 2) ContactMessage: rename NEW -> OPEN
ALTER TABLE `ContactMessage`
  MODIFY `status` ENUM('NEW','OPEN','REPLIED','CLOSED') NOT NULL DEFAULT 'OPEN';

UPDATE `ContactMessage` SET `status`='OPEN' WHERE `status`='NEW';

ALTER TABLE `ContactMessage`
  MODIFY `status` ENUM('OPEN','REPLIED','CLOSED') NOT NULL DEFAULT 'OPEN';

-- 3) BlogPost: tags
ALTER TABLE `BlogPost`
  ADD COLUMN `tags` JSON NULL;
