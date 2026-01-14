-- AlterTable
ALTER TABLE `blogpost` MODIFY `excerpt` TEXT NOT NULL,
    MODIFY `body` LONGTEXT NOT NULL,
    MODIFY `coverImageUrl` VARCHAR(2048) NULL;

-- AlterTable
ALTER TABLE `contactmessage` MODIFY `message` TEXT NOT NULL,
    MODIFY `adminReply` TEXT NULL;

-- AlterTable
ALTER TABLE `contentpage` MODIFY `body` LONGTEXT NOT NULL;
