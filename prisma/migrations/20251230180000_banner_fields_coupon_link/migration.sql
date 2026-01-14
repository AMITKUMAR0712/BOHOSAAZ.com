-- Add banner CTA/highlight fields and optional coupon linkage
-- Note: existing columns `linkUrl` and `position` are reused via Prisma @map (ctaHref/sortOrder)

-- Requires `Coupon`.`code` to be UNIQUE (it is in the Prisma schema)
ALTER TABLE `Banner`
  ADD CONSTRAINT `Banner_couponCode_fkey`
  FOREIGN KEY (`couponCode`) REFERENCES `Coupon`(`code`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;
