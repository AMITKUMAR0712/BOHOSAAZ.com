-- AlterTable
ALTER TABLE `category` ADD COLUMN `iconName` VARCHAR(191) NULL,
    ADD COLUMN `iconUrl` VARCHAR(2048) NULL;

-- CreateTable
CREATE TABLE `Ad` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `placement` ENUM('HOME_TOP', 'HOME_BETWEEN_SECTIONS', 'HOME_SIDEBAR', 'CATEGORY_TOP', 'PRODUCT_DETAIL_RIGHT', 'FOOTER_STRIP', 'SEARCH_TOP') NOT NULL,
    `type` ENUM('IMAGE_BANNER', 'HTML_SNIPPET', 'VIDEO', 'PRODUCT_SPOTLIGHT', 'BRAND_SPOTLIGHT') NOT NULL,
    `imageUrl` VARCHAR(2048) NULL,
    `linkUrl` VARCHAR(2048) NULL,
    `html` VARCHAR(191) NULL,
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `impressions` INTEGER NOT NULL DEFAULT 0,
    `clicks` INTEGER NOT NULL DEFAULT 0,
    `targetDevice` ENUM('ALL', 'MOBILE', 'DESKTOP') NOT NULL DEFAULT 'ALL',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Ad_placement_isActive_idx`(`placement`, `isActive`),
    INDEX `Ad_placement_isActive_startsAt_endsAt_idx`(`placement`, `isActive`, `startsAt`, `endsAt`),
    INDEX `Ad_priority_idx`(`priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdEvent` (
    `id` VARCHAR(191) NOT NULL,
    `adId` VARCHAR(191) NOT NULL,
    `type` ENUM('IMPRESSION', 'CLICK') NOT NULL,
    `ip` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `referrer` VARCHAR(2048) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AdEvent_adId_type_createdAt_idx`(`adId`, `type`, `createdAt`),
    INDEX `AdEvent_type_createdAt_idx`(`type`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AdEvent` ADD CONSTRAINT `AdEvent_adId_fkey` FOREIGN KEY (`adId`) REFERENCES `Ad`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
