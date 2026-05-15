/*
  Warnings:

  - You are about to alter the column `coverImageUrl` on the `blogpost` table. The data in that column could be lost. The data in that column will be cast from `VarChar(2048)` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `blogpost` MODIFY `excerpt` VARCHAR(191) NOT NULL,
    MODIFY `body` VARCHAR(191) NOT NULL,
    MODIFY `coverImageUrl` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `contactmessage` MODIFY `message` VARCHAR(191) NOT NULL,
    MODIFY `adminReply` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `contentpage` MODIFY `body` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `couponredemption` ALTER COLUMN `amountDiscounted` DROP DEFAULT;
