-- Add Brand + Product.brandId
ALTER TABLE `Product` ADD COLUMN `brandId` VARCHAR(191) NULL;

CREATE TABLE `Brand` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `logoUrl` VARCHAR(2048) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `Brand_slug_key`(`slug`),
  INDEX `Brand_isActive_idx`(`isActive`),
  INDEX `Brand_sortOrder_idx`(`sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Product` ADD CONSTRAINT `Product_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX `Product_brandId_idx` ON `Product`(`brandId`);

-- Extend Order.status enum to include COD_PENDING
ALTER TABLE `Order` MODIFY `status` ENUM('PENDING','COD_PENDING','PLACED','PAID','PACKED','SHIPPED','DELIVERED','CANCELLED','RETURN_REQUESTED','RETURN_APPROVED','REFUNDED') NOT NULL DEFAULT 'PENDING';

-- ContactMessage linkage to authenticated users
ALTER TABLE `ContactMessage` ADD COLUMN `userId` VARCHAR(191) NULL;
CREATE INDEX `ContactMessage_userId_idx` ON `ContactMessage`(`userId`);
ALTER TABLE `ContactMessage` ADD CONSTRAINT `ContactMessage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Razorpay order payments
CREATE TABLE `OrderPayment` (
  `id` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `amountPaise` BIGINT NOT NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'INR',
  `status` ENUM('CREATED','PAID','FAILED') NOT NULL DEFAULT 'CREATED',
  `razorpayOrderId` VARCHAR(191) NOT NULL,
  `razorpayPaymentId` VARCHAR(191) NULL,
  `capturedAt` DATETIME(3) NULL,
  `failedAt` DATETIME(3) NULL,
  `failureReason` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `OrderPayment_orderId_key`(`orderId`),
  UNIQUE INDEX `OrderPayment_razorpayOrderId_key`(`razorpayOrderId`),
  UNIQUE INDEX `OrderPayment_razorpayPaymentId_key`(`razorpayPaymentId`),
  INDEX `OrderPayment_status_idx`(`status`),
  INDEX `OrderPayment_razorpayOrderId_idx`(`razorpayOrderId`),
  INDEX `OrderPayment_razorpayPaymentId_idx`(`razorpayPaymentId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `OrderPayment` ADD CONSTRAINT `OrderPayment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Returns
CREATE TABLE `ReturnRequest` (
  `id` VARCHAR(191) NOT NULL,
  `orderItemId` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `vendorId` VARCHAR(191) NOT NULL,
  `status` ENUM('REQUESTED','APPROVED','REJECTED','PICKED','REFUNDED') NOT NULL DEFAULT 'REQUESTED',
  `reason` VARCHAR(191) NOT NULL,
  `images` JSON NULL,
  `pickupCourier` VARCHAR(191) NULL,
  `pickupTrackingNumber` VARCHAR(191) NULL,
  `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `approvedAt` DATETIME(3) NULL,
  `rejectedAt` DATETIME(3) NULL,
  `rejectReason` VARCHAR(191) NULL,
  `pickedAt` DATETIME(3) NULL,
  `refundedAt` DATETIME(3) NULL,
  `meta` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `ReturnRequest_orderItemId_key`(`orderItemId`),
  INDEX `ReturnRequest_orderId_idx`(`orderId`),
  INDEX `ReturnRequest_userId_idx`(`userId`),
  INDEX `ReturnRequest_vendorId_idx`(`vendorId`),
  INDEX `ReturnRequest_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ReturnRequest` ADD CONSTRAINT `ReturnRequest_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `OrderItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ReturnRequest` ADD CONSTRAINT `ReturnRequest_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ReturnRequest` ADD CONSTRAINT `ReturnRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ReturnRequest` ADD CONSTRAINT `ReturnRequest_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- User support tickets (user ↔ admin)
CREATE TABLE `UserTicket` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `category` ENUM('ORDER','PAYMENT','RETURN','GENERAL') NOT NULL,
  `subject` VARCHAR(191) NOT NULL,
  `status` ENUM('OPEN','IN_PROGRESS','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
  `priority` ENUM('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM',
  `orderId` VARCHAR(191) NULL,
  `returnRequestId` VARCHAR(191) NULL,
  `meta` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `UserTicket_userId_idx`(`userId`),
  INDEX `UserTicket_status_idx`(`status`),
  INDEX `UserTicket_priority_idx`(`priority`),
  INDEX `UserTicket_category_idx`(`category`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `UserTicket` ADD CONSTRAINT `UserTicket_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `UserTicket` ADD CONSTRAINT `UserTicket_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `UserTicket` ADD CONSTRAINT `UserTicket_returnRequestId_fkey` FOREIGN KEY (`returnRequestId`) REFERENCES `ReturnRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `UserTicketMessage` (
  `id` VARCHAR(191) NOT NULL,
  `ticketId` VARCHAR(191) NOT NULL,
  `senderId` VARCHAR(191) NOT NULL,
  `senderRole` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `attachments` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `UserTicketMessage_ticketId_idx`(`ticketId`),
  INDEX `UserTicketMessage_senderId_idx`(`senderId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `UserTicketMessage` ADD CONSTRAINT `UserTicketMessage_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `UserTicket`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `UserTicketMessage` ADD CONSTRAINT `UserTicketMessage_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
