-- Add missing vendor contact fields
ALTER TABLE `Vendor`
  ADD COLUMN `contactEmail` VARCHAR(191) NULL,
  ADD COLUMN `contactPhone` VARCHAR(191) NULL;
