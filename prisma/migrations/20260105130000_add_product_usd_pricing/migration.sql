-- Add optional USD pricing and currency mode to Product

ALTER TABLE `Product`
    ADD COLUMN `priceUsd` DOUBLE NULL,
    ADD COLUMN `salePriceUsd` DOUBLE NULL,
    ADD COLUMN `currencyMode` ENUM('INR_ONLY', 'INR_USD') NOT NULL DEFAULT 'INR_ONLY';
