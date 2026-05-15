/*
  Warnings:

  - You are about to drop the `sitesettings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `adevent` DROP FOREIGN KEY `AdEvent_adId_fkey`;

-- DropForeignKey
ALTER TABLE `banner` DROP FOREIGN KEY `Banner_couponCode_fkey`;

-- DropForeignKey
ALTER TABLE `cmspageversion` DROP FOREIGN KEY `CmsPageVersion_pageId_fkey`;

-- DropForeignKey
ALTER TABLE `commissionhistory` DROP FOREIGN KEY `CommissionHistory_planId_fkey`;

-- DropForeignKey
ALTER TABLE `commissionhistory` DROP FOREIGN KEY `CommissionHistory_vendorId_fkey`;

-- DropForeignKey
ALTER TABLE `commissionhistory` DROP FOREIGN KEY `CommissionHistory_vendorOrderId_fkey`;

-- DropForeignKey
ALTER TABLE `commissionplan` DROP FOREIGN KEY `CommissionPlan_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `commissionplan` DROP FOREIGN KEY `CommissionPlan_vendorId_fkey`;

-- DropForeignKey
ALTER TABLE `contactmessage` DROP FOREIGN KEY `ContactMessage_userId_fkey`;

-- DropForeignKey
ALTER TABLE `couponredemption` DROP FOREIGN KEY `CouponRedemption_couponId_fkey`;

-- DropForeignKey
ALTER TABLE `couponredemption` DROP FOREIGN KEY `CouponRedemption_orderId_fkey`;

-- DropForeignKey
ALTER TABLE `couponredemption` DROP FOREIGN KEY `CouponRedemption_userId_fkey`;

-- DropForeignKey
ALTER TABLE `order` DROP FOREIGN KEY `Order_couponId_fkey`;

-- DropForeignKey
ALTER TABLE `order` DROP FOREIGN KEY `Order_userId_fkey`;

-- DropForeignKey
ALTER TABLE `orderitem` DROP FOREIGN KEY `OrderItem_orderId_fkey`;

-- DropForeignKey
ALTER TABLE `orderitem` DROP FOREIGN KEY `OrderItem_productId_fkey`;

-- DropForeignKey
ALTER TABLE `orderitem` DROP FOREIGN KEY `OrderItem_variantId_fkey`;

-- DropForeignKey
ALTER TABLE `orderitem` DROP FOREIGN KEY `OrderItem_vendorOrderId_fkey`;

-- DropForeignKey
ALTER TABLE `orderpayment` DROP FOREIGN KEY `OrderPayment_orderId_fkey`;

-- DropForeignKey
ALTER TABLE `passwordresettoken` DROP FOREIGN KEY `PasswordResetToken_userId_fkey`;

-- DropForeignKey
ALTER TABLE `payout` DROP FOREIGN KEY `Payout_vendorId_fkey`;

-- DropForeignKey
ALTER TABLE `payout` DROP FOREIGN KEY `Payout_vendorOrderId_fkey`;

-- DropForeignKey
ALTER TABLE `product` DROP FOREIGN KEY `Product_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `product` DROP FOREIGN KEY `Product_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `product` DROP FOREIGN KEY `Product_vendorId_fkey`;

-- DropForeignKey
ALTER TABLE `productimage` DROP FOREIGN KEY `ProductImage_productId_fkey`;

-- DropForeignKey
ALTER TABLE `producttag` DROP FOREIGN KEY `ProductTag_productId_fkey`;

-- DropForeignKey
ALTER TABLE `producttag` DROP FOREIGN KEY `ProductTag_tagId_fkey`;

-- DropForeignKey
ALTER TABLE `productvariant` DROP FOREIGN KEY `ProductVariant_productId_fkey`;

-- DropForeignKey
ALTER TABLE `razorpaytopup` DROP FOREIGN KEY `RazorpayTopup_userId_fkey`;

-- DropForeignKey
ALTER TABLE `razorpaytopup` DROP FOREIGN KEY `RazorpayTopup_walletId_fkey`;

-- DropForeignKey
ALTER TABLE `refundrecord` DROP FOREIGN KEY `RefundRecord_orderId_fkey`;

-- DropForeignKey
ALTER TABLE `refundrecord` DROP FOREIGN KEY `RefundRecord_returnRequestId_fkey`;

-- DropForeignKey
ALTER TABLE `refundrecord` DROP FOREIGN KEY `RefundRecord_userId_fkey`;

-- DropForeignKey
ALTER TABLE `refundrecord` DROP FOREIGN KEY `RefundRecord_walletTxnId_fkey`;

-- DropForeignKey
ALTER TABLE `returnrequest` DROP FOREIGN KEY `ReturnRequest_orderId_fkey`;

-- DropForeignKey
ALTER TABLE `returnrequest` DROP FOREIGN KEY `ReturnRequest_orderItemId_fkey`;

-- DropForeignKey
ALTER TABLE `returnrequest` DROP FOREIGN KEY `ReturnRequest_userId_fkey`;

-- DropForeignKey
ALTER TABLE `returnrequest` DROP FOREIGN KEY `ReturnRequest_vendorId_fkey`;

-- DropForeignKey
ALTER TABLE `returntrackingevent` DROP FOREIGN KEY `ReturnTrackingEvent_returnRequestId_fkey`;

-- DropForeignKey
ALTER TABLE `supportticket` DROP FOREIGN KEY `SupportTicket_createdBy_fkey`;

-- DropForeignKey
ALTER TABLE `supportticket` DROP FOREIGN KEY `SupportTicket_orderId_fkey`;

-- DropForeignKey
ALTER TABLE `supportticket` DROP FOREIGN KEY `SupportTicket_productId_fkey`;

-- DropForeignKey
ALTER TABLE `supportticket` DROP FOREIGN KEY `SupportTicket_vendorId_fkey`;

-- DropForeignKey
ALTER TABLE `supportticketmessage` DROP FOREIGN KEY `SupportTicketMessage_senderId_fkey`;

-- DropForeignKey
ALTER TABLE `supportticketmessage` DROP FOREIGN KEY `SupportTicketMessage_ticketId_fkey`;

-- DropForeignKey
ALTER TABLE `userticket` DROP FOREIGN KEY `UserTicket_orderId_fkey`;

-- DropForeignKey
ALTER TABLE `userticket` DROP FOREIGN KEY `UserTicket_returnRequestId_fkey`;

-- DropForeignKey
ALTER TABLE `userticket` DROP FOREIGN KEY `UserTicket_userId_fkey`;

-- DropForeignKey
ALTER TABLE `userticketmessage` DROP FOREIGN KEY `UserTicketMessage_senderId_fkey`;

-- DropForeignKey
ALTER TABLE `userticketmessage` DROP FOREIGN KEY `UserTicketMessage_ticketId_fkey`;

-- DropForeignKey
ALTER TABLE `vendor` DROP FOREIGN KEY `Vendor_userId_fkey`;

-- DropForeignKey
ALTER TABLE `vendorbankaccount` DROP FOREIGN KEY `VendorBankAccount_vendorId_fkey`;

-- DropForeignKey
ALTER TABLE `vendorkyc` DROP FOREIGN KEY `VendorKyc_vendorId_fkey`;

-- DropForeignKey
ALTER TABLE `vendororder` DROP FOREIGN KEY `VendorOrder_orderId_fkey`;

-- DropForeignKey
ALTER TABLE `vendororder` DROP FOREIGN KEY `VendorOrder_vendorId_fkey`;

-- DropForeignKey
ALTER TABLE `walletaccount` DROP FOREIGN KEY `WalletAccount_userId_fkey`;

-- DropForeignKey
ALTER TABLE `walletaccount` DROP FOREIGN KEY `WalletAccount_vendorId_fkey`;

-- DropForeignKey
ALTER TABLE `wallettransaction` DROP FOREIGN KEY `WalletTransaction_orderId_fkey`;

-- DropForeignKey
ALTER TABLE `wallettransaction` DROP FOREIGN KEY `WalletTransaction_payoutId_fkey`;

-- DropForeignKey
ALTER TABLE `wallettransaction` DROP FOREIGN KEY `WalletTransaction_vendorOrderId_fkey`;

-- DropForeignKey
ALTER TABLE `wallettransaction` DROP FOREIGN KEY `WalletTransaction_walletId_fkey`;

-- DropForeignKey
ALTER TABLE `wishlistitem` DROP FOREIGN KEY `WishlistItem_productId_fkey`;

-- DropForeignKey
ALTER TABLE `wishlistitem` DROP FOREIGN KEY `WishlistItem_userId_fkey`;

-- AlterTable
ALTER TABLE `product` ADD COLUMN `status` ENUM('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED') NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE `vendor` ADD COLUMN `bannerUrl` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `sitesettings`;

-- AddForeignKey
ALTER TABLE `vendor` ADD CONSTRAINT `vendor_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendorkyc` ADD CONSTRAINT `vendorkyc_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendorbankaccount` ADD CONSTRAINT `vendorbankaccount_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wishlistitem` ADD CONSTRAINT `wishlistitem_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wishlistitem` ADD CONSTRAINT `wishlistitem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `passwordresettoken` ADD CONSTRAINT `passwordresettoken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `walletaccount` ADD CONSTRAINT `walletaccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `walletaccount` ADD CONSTRAINT `walletaccount_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallettransaction` ADD CONSTRAINT `wallettransaction_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `walletaccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallettransaction` ADD CONSTRAINT `wallettransaction_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallettransaction` ADD CONSTRAINT `wallettransaction_vendorOrderId_fkey` FOREIGN KEY (`vendorOrderId`) REFERENCES `vendororder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallettransaction` ADD CONSTRAINT `wallettransaction_payoutId_fkey` FOREIGN KEY (`payoutId`) REFERENCES `payout`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `razorpaytopup` ADD CONSTRAINT `razorpaytopup_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `walletaccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `razorpaytopup` ADD CONSTRAINT `razorpaytopup_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payout` ADD CONSTRAINT `payout_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payout` ADD CONSTRAINT `payout_vendorOrderId_fkey` FOREIGN KEY (`vendorOrderId`) REFERENCES `vendororder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commissionplan` ADD CONSTRAINT `commissionplan_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commissionplan` ADD CONSTRAINT `commissionplan_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commissionhistory` ADD CONSTRAINT `commissionhistory_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commissionhistory` ADD CONSTRAINT `commissionhistory_vendorOrderId_fkey` FOREIGN KEY (`vendorOrderId`) REFERENCES `vendororder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commissionhistory` ADD CONSTRAINT `commissionhistory_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `commissionplan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supportticket` ADD CONSTRAINT `supportticket_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supportticket` ADD CONSTRAINT `supportticket_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supportticket` ADD CONSTRAINT `supportticket_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supportticket` ADD CONSTRAINT `supportticket_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supportticketmessage` ADD CONSTRAINT `supportticketmessage_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `supportticket`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supportticketmessage` ADD CONSTRAINT `supportticketmessage_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `adevent` ADD CONSTRAINT `adevent_adId_fkey` FOREIGN KEY (`adId`) REFERENCES `ad`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `couponredemption` ADD CONSTRAINT `couponredemption_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `coupon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `couponredemption` ADD CONSTRAINT `couponredemption_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `couponredemption` ADD CONSTRAINT `couponredemption_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contactmessage` ADD CONSTRAINT `contactmessage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `banner` ADD CONSTRAINT `banner_couponCode_fkey` FOREIGN KEY (`couponCode`) REFERENCES `coupon`(`code`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cmspageversion` ADD CONSTRAINT `cmspageversion_pageId_fkey` FOREIGN KEY (`pageId`) REFERENCES `cmspage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `product_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `product_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brand`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productvariant` ADD CONSTRAINT `productvariant_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `producttag` ADD CONSTRAINT `producttag_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `producttag` ADD CONSTRAINT `producttag_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productimage` ADD CONSTRAINT `productimage_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendororder` ADD CONSTRAINT `vendororder_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendororder` ADD CONSTRAINT `vendororder_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `coupon`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orderpayment` ADD CONSTRAINT `orderpayment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orderitem` ADD CONSTRAINT `orderitem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orderitem` ADD CONSTRAINT `orderitem_vendorOrderId_fkey` FOREIGN KEY (`vendorOrderId`) REFERENCES `vendororder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orderitem` ADD CONSTRAINT `orderitem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orderitem` ADD CONSTRAINT `orderitem_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `productvariant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `returnrequest` ADD CONSTRAINT `returnrequest_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `orderitem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `returnrequest` ADD CONSTRAINT `returnrequest_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `returnrequest` ADD CONSTRAINT `returnrequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `returnrequest` ADD CONSTRAINT `returnrequest_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `returntrackingevent` ADD CONSTRAINT `returntrackingevent_returnRequestId_fkey` FOREIGN KEY (`returnRequestId`) REFERENCES `returnrequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refundrecord` ADD CONSTRAINT `refundrecord_returnRequestId_fkey` FOREIGN KEY (`returnRequestId`) REFERENCES `returnrequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refundrecord` ADD CONSTRAINT `refundrecord_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refundrecord` ADD CONSTRAINT `refundrecord_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refundrecord` ADD CONSTRAINT `refundrecord_walletTxnId_fkey` FOREIGN KEY (`walletTxnId`) REFERENCES `wallettransaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userticket` ADD CONSTRAINT `userticket_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userticket` ADD CONSTRAINT `userticket_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userticket` ADD CONSTRAINT `userticket_returnRequestId_fkey` FOREIGN KEY (`returnRequestId`) REFERENCES `returnrequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userticketmessage` ADD CONSTRAINT `userticketmessage_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `userticket`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userticketmessage` ADD CONSTRAINT `userticketmessage_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `ad` RENAME INDEX `Ad_placement_isActive_idx` TO `ad_placement_isActive_idx`;

-- RenameIndex
ALTER TABLE `ad` RENAME INDEX `Ad_placement_isActive_startsAt_endsAt_idx` TO `ad_placement_isActive_startsAt_endsAt_idx`;

-- RenameIndex
ALTER TABLE `ad` RENAME INDEX `Ad_priority_idx` TO `ad_priority_idx`;

-- RenameIndex
ALTER TABLE `adevent` RENAME INDEX `AdEvent_adId_type_createdAt_idx` TO `adevent_adId_type_createdAt_idx`;

-- RenameIndex
ALTER TABLE `adevent` RENAME INDEX `AdEvent_type_createdAt_idx` TO `adevent_type_createdAt_idx`;

-- RenameIndex
ALTER TABLE `banner` RENAME INDEX `Banner_couponCode_idx` TO `banner_couponCode_idx`;

-- RenameIndex
ALTER TABLE `banner` RENAME INDEX `Banner_isActive_idx` TO `banner_isActive_idx`;

-- RenameIndex
ALTER TABLE `banner` RENAME INDEX `Banner_position_idx` TO `banner_position_idx`;

-- RenameIndex
ALTER TABLE `blogpost` RENAME INDEX `BlogPost_isPublished_idx` TO `blogpost_isPublished_idx`;

-- RenameIndex
ALTER TABLE `blogpost` RENAME INDEX `BlogPost_publishedAt_idx` TO `blogpost_publishedAt_idx`;

-- RenameIndex
ALTER TABLE `blogpost` RENAME INDEX `BlogPost_slug_key` TO `blogpost_slug_key`;

-- RenameIndex
ALTER TABLE `brand` RENAME INDEX `Brand_isActive_idx` TO `brand_isActive_idx`;

-- RenameIndex
ALTER TABLE `brand` RENAME INDEX `Brand_slug_key` TO `brand_slug_key`;

-- RenameIndex
ALTER TABLE `brand` RENAME INDEX `Brand_sortOrder_idx` TO `brand_sortOrder_idx`;

-- RenameIndex
ALTER TABLE `category` RENAME INDEX `Category_slug_key` TO `category_slug_key`;

-- RenameIndex
ALTER TABLE `cmspage` RENAME INDEX `CmsPage_slug_key` TO `cmspage_slug_key`;

-- RenameIndex
ALTER TABLE `cmspageversion` RENAME INDEX `CmsPageVersion_pageId_idx` TO `cmspageversion_pageId_idx`;

-- RenameIndex
ALTER TABLE `commissionhistory` RENAME INDEX `CommissionHistory_vendorId_createdAt_idx` TO `commissionhistory_vendorId_createdAt_idx`;

-- RenameIndex
ALTER TABLE `commissionhistory` RENAME INDEX `CommissionHistory_vendorOrderId_key` TO `commissionhistory_vendorOrderId_key`;

-- RenameIndex
ALTER TABLE `commissionplan` RENAME INDEX `CommissionPlan_categoryId_idx` TO `commissionplan_categoryId_idx`;

-- RenameIndex
ALTER TABLE `commissionplan` RENAME INDEX `CommissionPlan_scope_idx` TO `commissionplan_scope_idx`;

-- RenameIndex
ALTER TABLE `commissionplan` RENAME INDEX `CommissionPlan_scope_vendorId_categoryId_key` TO `commissionplan_scope_vendorId_categoryId_key`;

-- RenameIndex
ALTER TABLE `commissionplan` RENAME INDEX `CommissionPlan_vendorId_idx` TO `commissionplan_vendorId_idx`;

-- RenameIndex
ALTER TABLE `contactmessage` RENAME INDEX `ContactMessage_createdAt_idx` TO `contactmessage_createdAt_idx`;

-- RenameIndex
ALTER TABLE `contactmessage` RENAME INDEX `ContactMessage_status_idx` TO `contactmessage_status_idx`;

-- RenameIndex
ALTER TABLE `contactmessage` RENAME INDEX `ContactMessage_userId_idx` TO `contactmessage_userId_idx`;

-- RenameIndex
ALTER TABLE `contentpage` RENAME INDEX `ContentPage_slug_key` TO `contentpage_slug_key`;

-- RenameIndex
ALTER TABLE `coupon` RENAME INDEX `Coupon_appliesTo_idx` TO `coupon_appliesTo_idx`;

-- RenameIndex
ALTER TABLE `coupon` RENAME INDEX `Coupon_categoryId_idx` TO `coupon_categoryId_idx`;

-- RenameIndex
ALTER TABLE `coupon` RENAME INDEX `Coupon_code_key` TO `coupon_code_key`;

-- RenameIndex
ALTER TABLE `coupon` RENAME INDEX `Coupon_productId_idx` TO `coupon_productId_idx`;

-- RenameIndex
ALTER TABLE `couponredemption` RENAME INDEX `CouponRedemption_couponId_idx` TO `couponredemption_couponId_idx`;

-- RenameIndex
ALTER TABLE `couponredemption` RENAME INDEX `CouponRedemption_couponId_orderId_key` TO `couponredemption_couponId_orderId_key`;

-- RenameIndex
ALTER TABLE `couponredemption` RENAME INDEX `CouponRedemption_userId_idx` TO `couponredemption_userId_idx`;

-- RenameIndex
ALTER TABLE `cronlog` RENAME INDEX `CronLog_jobName_idx` TO `cronlog_jobName_idx`;

-- RenameIndex
ALTER TABLE `cronlog` RENAME INDEX `CronLog_ok_idx` TO `cronlog_ok_idx`;

-- RenameIndex
ALTER TABLE `newslettersubscriber` RENAME INDEX `NewsletterSubscriber_email_key` TO `newslettersubscriber_email_key`;

-- RenameIndex
ALTER TABLE `notificationdelivery` RENAME INDEX `NotificationDelivery_broadcastId_idx` TO `notificationdelivery_broadcastId_idx`;

-- RenameIndex
ALTER TABLE `notificationdelivery` RENAME INDEX `NotificationDelivery_userId_idx` TO `notificationdelivery_userId_idx`;

-- RenameIndex
ALTER TABLE `notificationdelivery` RENAME INDEX `NotificationDelivery_vendorId_idx` TO `notificationdelivery_vendorId_idx`;

-- RenameIndex
ALTER TABLE `notificationtemplate` RENAME INDEX `NotificationTemplate_key_key` TO `notificationtemplate_key_key`;

-- RenameIndex
ALTER TABLE `orderitem` RENAME INDEX `OrderItem_orderId_idx` TO `orderitem_orderId_idx`;

-- RenameIndex
ALTER TABLE `orderitem` RENAME INDEX `OrderItem_productId_idx` TO `orderitem_productId_idx`;

-- RenameIndex
ALTER TABLE `orderitem` RENAME INDEX `OrderItem_variantId_idx` TO `orderitem_variantId_idx`;

-- RenameIndex
ALTER TABLE `orderpayment` RENAME INDEX `OrderPayment_orderId_key` TO `orderpayment_orderId_key`;

-- RenameIndex
ALTER TABLE `orderpayment` RENAME INDEX `OrderPayment_razorpayOrderId_idx` TO `orderpayment_razorpayOrderId_idx`;

-- RenameIndex
ALTER TABLE `orderpayment` RENAME INDEX `OrderPayment_razorpayOrderId_key` TO `orderpayment_razorpayOrderId_key`;

-- RenameIndex
ALTER TABLE `orderpayment` RENAME INDEX `OrderPayment_razorpayPaymentId_idx` TO `orderpayment_razorpayPaymentId_idx`;

-- RenameIndex
ALTER TABLE `orderpayment` RENAME INDEX `OrderPayment_razorpayPaymentId_key` TO `orderpayment_razorpayPaymentId_key`;

-- RenameIndex
ALTER TABLE `orderpayment` RENAME INDEX `OrderPayment_status_idx` TO `orderpayment_status_idx`;

-- RenameIndex
ALTER TABLE `passwordresettoken` RENAME INDEX `PasswordResetToken_email_idx` TO `passwordresettoken_email_idx`;

-- RenameIndex
ALTER TABLE `passwordresettoken` RENAME INDEX `PasswordResetToken_otpExpiresAt_idx` TO `passwordresettoken_otpExpiresAt_idx`;

-- RenameIndex
ALTER TABLE `passwordresettoken` RENAME INDEX `PasswordResetToken_userId_idx` TO `passwordresettoken_userId_idx`;

-- RenameIndex
ALTER TABLE `payout` RENAME INDEX `Payout_status_idx` TO `payout_status_idx`;

-- RenameIndex
ALTER TABLE `payout` RENAME INDEX `Payout_vendorId_idx` TO `payout_vendorId_idx`;

-- RenameIndex
ALTER TABLE `payout` RENAME INDEX `Payout_vendorOrderId_key` TO `payout_vendorOrderId_key`;

-- RenameIndex
ALTER TABLE `product` RENAME INDEX `Product_barcode_idx` TO `product_barcode_idx`;

-- RenameIndex
ALTER TABLE `product` RENAME INDEX `Product_brandId_idx` TO `product_brandId_idx`;

-- RenameIndex
ALTER TABLE `product` RENAME INDEX `Product_categoryId_idx` TO `product_categoryId_idx`;

-- RenameIndex
ALTER TABLE `product` RENAME INDEX `Product_deletedAt_idx` TO `product_deletedAt_idx`;

-- RenameIndex
ALTER TABLE `product` RENAME INDEX `Product_isActive_idx` TO `product_isActive_idx`;

-- RenameIndex
ALTER TABLE `product` RENAME INDEX `Product_sku_idx` TO `product_sku_idx`;

-- RenameIndex
ALTER TABLE `product` RENAME INDEX `Product_slug_key` TO `product_slug_key`;

-- RenameIndex
ALTER TABLE `product` RENAME INDEX `Product_vendorId_idx` TO `product_vendorId_idx`;

-- RenameIndex
ALTER TABLE `productimage` RENAME INDEX `ProductImage_productId_idx` TO `productimage_productId_idx`;

-- RenameIndex
ALTER TABLE `producttag` RENAME INDEX `ProductTag_tagId_idx` TO `producttag_tagId_idx`;

-- RenameIndex
ALTER TABLE `productvariant` RENAME INDEX `ProductVariant_color_idx` TO `productvariant_color_idx`;

-- RenameIndex
ALTER TABLE `productvariant` RENAME INDEX `ProductVariant_productId_idx` TO `productvariant_productId_idx`;

-- RenameIndex
ALTER TABLE `productvariant` RENAME INDEX `ProductVariant_productId_sku_key` TO `productvariant_productId_sku_key`;

-- RenameIndex
ALTER TABLE `productvariant` RENAME INDEX `ProductVariant_size_idx` TO `productvariant_size_idx`;

-- RenameIndex
ALTER TABLE `razorpaytopup` RENAME INDEX `RazorpayTopup_razorpayOrderId_key` TO `razorpaytopup_razorpayOrderId_key`;

-- RenameIndex
ALTER TABLE `razorpaytopup` RENAME INDEX `RazorpayTopup_razorpayPaymentId_key` TO `razorpaytopup_razorpayPaymentId_key`;

-- RenameIndex
ALTER TABLE `razorpaytopup` RENAME INDEX `RazorpayTopup_status_idx` TO `razorpaytopup_status_idx`;

-- RenameIndex
ALTER TABLE `razorpaytopup` RENAME INDEX `RazorpayTopup_userId_idx` TO `razorpaytopup_userId_idx`;

-- RenameIndex
ALTER TABLE `razorpaytopup` RENAME INDEX `RazorpayTopup_walletId_idx` TO `razorpaytopup_walletId_idx`;

-- RenameIndex
ALTER TABLE `refundrecord` RENAME INDEX `RefundRecord_orderId_idx` TO `refundrecord_orderId_idx`;

-- RenameIndex
ALTER TABLE `refundrecord` RENAME INDEX `RefundRecord_returnRequestId_key` TO `refundrecord_returnRequestId_key`;

-- RenameIndex
ALTER TABLE `refundrecord` RENAME INDEX `RefundRecord_status_idx` TO `refundrecord_status_idx`;

-- RenameIndex
ALTER TABLE `refundrecord` RENAME INDEX `RefundRecord_userId_idx` TO `refundrecord_userId_idx`;

-- RenameIndex
ALTER TABLE `refundrecord` RENAME INDEX `RefundRecord_walletTxnId_key` TO `refundrecord_walletTxnId_key`;

-- RenameIndex
ALTER TABLE `returnrequest` RENAME INDEX `ReturnRequest_orderId_idx` TO `returnrequest_orderId_idx`;

-- RenameIndex
ALTER TABLE `returnrequest` RENAME INDEX `ReturnRequest_orderItemId_key` TO `returnrequest_orderItemId_key`;

-- RenameIndex
ALTER TABLE `returnrequest` RENAME INDEX `ReturnRequest_status_idx` TO `returnrequest_status_idx`;

-- RenameIndex
ALTER TABLE `returnrequest` RENAME INDEX `ReturnRequest_userId_idx` TO `returnrequest_userId_idx`;

-- RenameIndex
ALTER TABLE `returnrequest` RENAME INDEX `ReturnRequest_vendorId_idx` TO `returnrequest_vendorId_idx`;

-- RenameIndex
ALTER TABLE `returntrackingevent` RENAME INDEX `ReturnTrackingEvent_returnRequestId_createdAt_idx` TO `returntrackingevent_returnRequestId_createdAt_idx`;

-- RenameIndex
ALTER TABLE `supportticket` RENAME INDEX `SupportTicket_status_idx` TO `supportticket_status_idx`;

-- RenameIndex
ALTER TABLE `supportticket` RENAME INDEX `SupportTicket_vendorId_idx` TO `supportticket_vendorId_idx`;

-- RenameIndex
ALTER TABLE `supportticketmessage` RENAME INDEX `SupportTicketMessage_ticketId_idx` TO `supportticketmessage_ticketId_idx`;

-- RenameIndex
ALTER TABLE `tag` RENAME INDEX `Tag_name_key` TO `tag_name_key`;

-- RenameIndex
ALTER TABLE `tag` RENAME INDEX `Tag_slug_key` TO `tag_slug_key`;

-- RenameIndex
ALTER TABLE `user` RENAME INDEX `User_email_key` TO `user_email_key`;

-- RenameIndex
ALTER TABLE `userticket` RENAME INDEX `UserTicket_category_idx` TO `userticket_category_idx`;

-- RenameIndex
ALTER TABLE `userticket` RENAME INDEX `UserTicket_priority_idx` TO `userticket_priority_idx`;

-- RenameIndex
ALTER TABLE `userticket` RENAME INDEX `UserTicket_status_idx` TO `userticket_status_idx`;

-- RenameIndex
ALTER TABLE `userticket` RENAME INDEX `UserTicket_userId_idx` TO `userticket_userId_idx`;

-- RenameIndex
ALTER TABLE `userticketmessage` RENAME INDEX `UserTicketMessage_senderId_idx` TO `userticketmessage_senderId_idx`;

-- RenameIndex
ALTER TABLE `userticketmessage` RENAME INDEX `UserTicketMessage_ticketId_idx` TO `userticketmessage_ticketId_idx`;

-- RenameIndex
ALTER TABLE `vendor` RENAME INDEX `Vendor_userId_key` TO `vendor_userId_key`;

-- RenameIndex
ALTER TABLE `vendorbankaccount` RENAME INDEX `VendorBankAccount_vendorId_key` TO `vendorbankaccount_vendorId_key`;

-- RenameIndex
ALTER TABLE `vendorkyc` RENAME INDEX `VendorKyc_status_idx` TO `vendorkyc_status_idx`;

-- RenameIndex
ALTER TABLE `vendorkyc` RENAME INDEX `VendorKyc_vendorId_key` TO `vendorkyc_vendorId_key`;

-- RenameIndex
ALTER TABLE `walletaccount` RENAME INDEX `WalletAccount_kind_idx` TO `walletaccount_kind_idx`;

-- RenameIndex
ALTER TABLE `walletaccount` RENAME INDEX `WalletAccount_platformKey_key` TO `walletaccount_platformKey_key`;

-- RenameIndex
ALTER TABLE `walletaccount` RENAME INDEX `WalletAccount_userId_key` TO `walletaccount_userId_key`;

-- RenameIndex
ALTER TABLE `walletaccount` RENAME INDEX `WalletAccount_vendorId_key` TO `walletaccount_vendorId_key`;

-- RenameIndex
ALTER TABLE `wallettransaction` RENAME INDEX `WalletTransaction_idempotencyKey_key` TO `wallettransaction_idempotencyKey_key`;

-- RenameIndex
ALTER TABLE `wallettransaction` RENAME INDEX `WalletTransaction_orderId_idx` TO `wallettransaction_orderId_idx`;

-- RenameIndex
ALTER TABLE `wallettransaction` RENAME INDEX `WalletTransaction_payoutId_idx` TO `wallettransaction_payoutId_idx`;

-- RenameIndex
ALTER TABLE `wallettransaction` RENAME INDEX `WalletTransaction_razorpayOrderId_idx` TO `wallettransaction_razorpayOrderId_idx`;

-- RenameIndex
ALTER TABLE `wallettransaction` RENAME INDEX `WalletTransaction_razorpayPaymentId_idx` TO `wallettransaction_razorpayPaymentId_idx`;

-- RenameIndex
ALTER TABLE `wallettransaction` RENAME INDEX `WalletTransaction_type_idx` TO `wallettransaction_type_idx`;

-- RenameIndex
ALTER TABLE `wallettransaction` RENAME INDEX `WalletTransaction_vendorOrderId_idx` TO `wallettransaction_vendorOrderId_idx`;

-- RenameIndex
ALTER TABLE `wallettransaction` RENAME INDEX `WalletTransaction_walletId_createdAt_idx` TO `wallettransaction_walletId_createdAt_idx`;

-- RenameIndex
ALTER TABLE `webhooklog` RENAME INDEX `WebhookLog_ok_idx` TO `webhooklog_ok_idx`;

-- RenameIndex
ALTER TABLE `webhooklog` RENAME INDEX `WebhookLog_provider_idx` TO `webhooklog_provider_idx`;

-- RenameIndex
ALTER TABLE `wishlistitem` RENAME INDEX `WishlistItem_productId_idx` TO `wishlistitem_productId_idx`;

-- RenameIndex
ALTER TABLE `wishlistitem` RENAME INDEX `WishlistItem_userId_idx` TO `wishlistitem_userId_idx`;

-- RenameIndex
ALTER TABLE `wishlistitem` RENAME INDEX `WishlistItem_userId_productId_key` TO `wishlistitem_userId_productId_key`;
