ALTER TABLE `brand` ADD COLUMN `brandType` VARCHAR(191) NOT NULL DEFAULT 'POPULAR';
CREATE INDEX `brand_brandType_idx` ON `brand`(`brandType`);
