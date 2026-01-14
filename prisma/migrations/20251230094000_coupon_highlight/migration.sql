-- Add Coupon.isHighlighted flag used by homepage/featured coupon APIs

ALTER TABLE `Coupon`
  ADD COLUMN `isHighlighted` BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX `Coupon_isHighlighted_idx` ON `Coupon`(`isHighlighted`);
