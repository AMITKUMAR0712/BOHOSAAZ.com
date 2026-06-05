ALTER TABLE `product`
  ADD COLUMN `isFeatured` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `isTrending` BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX `product_isFeatured_idx` ON `product`(`isFeatured`);
CREATE INDEX `product_isTrending_idx` ON `product`(`isTrending`);
