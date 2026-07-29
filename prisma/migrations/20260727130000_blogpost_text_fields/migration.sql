-- AlterTable
ALTER TABLE `blogpost` MODIFY `excerpt` TEXT NOT NULL,
    MODIFY `body` TEXT NOT NULL,
    MODIFY `coverImageUrl` VARCHAR(2048) NULL;
