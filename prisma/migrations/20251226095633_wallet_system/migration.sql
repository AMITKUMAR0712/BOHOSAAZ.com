-- CreateIndex
CREATE INDEX `Product_isActive_idx` ON `Product`(`isActive`);

-- RenameIndex
ALTER TABLE `orderitem` RENAME INDEX `OrderItem_orderId_fkey` TO `OrderItem_orderId_idx`;

-- RenameIndex
ALTER TABLE `orderitem` RENAME INDEX `OrderItem_productId_fkey` TO `OrderItem_productId_idx`;

-- RenameIndex
ALTER TABLE `product` RENAME INDEX `Product_categoryId_fkey` TO `Product_categoryId_idx`;

-- RenameIndex
ALTER TABLE `product` RENAME INDEX `Product_vendorId_fkey` TO `Product_vendorId_idx`;
