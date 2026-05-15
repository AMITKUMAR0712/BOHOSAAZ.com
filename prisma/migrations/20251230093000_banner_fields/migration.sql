-- Extend Banner to match app fields (sortOrder/ctaHref/highlightText/ctaText/couponCode)

ALTER TABLE `Banner`
  ADD COLUMN `highlightText` VARCHAR(200) NULL,
  ADD COLUMN `ctaText` VARCHAR(80) NULL,
  ADD COLUMN `couponCode` VARCHAR(64) NULL;

CREATE INDEX `Banner_couponCode_idx` ON `Banner`(`couponCode`);
