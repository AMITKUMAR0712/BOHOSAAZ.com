-- Single-currency pricing per product (INR or USD)
--
-- Mapping rules:
-- - If currencyMode=INR_USD and priceUsd is present: currency=USD and copy USD fields into base columns.
-- - Otherwise: currency=INR and copy INR MRP into mrp.
--
-- NOTE: This migration assumes the existing schema has columns:
--   mrpInr, price (INR), salePrice (INR), mrpUsd, priceUsd, salePriceUsd, currencyMode

ALTER TABLE `Product` ADD COLUMN `currency` ENUM('INR','USD') NOT NULL DEFAULT 'INR';
ALTER TABLE `Product` ADD COLUMN `mrp` DOUBLE NULL;

-- Prefer USD when explicitly configured
UPDATE `Product`
SET
  `currency` = 'USD',
  `mrp` = `mrpUsd`,
  `price` = `priceUsd`,
  `salePrice` = `salePriceUsd`
WHERE `currencyMode` = 'INR_USD' AND `priceUsd` IS NOT NULL;

-- Default to INR (existing base columns already store INR price/salePrice)
UPDATE `Product`
SET
  `currency` = 'INR',
  `mrp` = `mrpInr`
WHERE (`currency` = 'INR') AND (`mrp` IS NULL);

ALTER TABLE `Product`
  DROP COLUMN `mrpInr`,
  DROP COLUMN `mrpUsd`,
  DROP COLUMN `priceUsd`,
  DROP COLUMN `salePriceUsd`,
  DROP COLUMN `currencyMode`;
