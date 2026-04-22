-- AlterTable
ALTER TABLE `roles` ADD COLUMN `deleted_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `departments` ADD COLUMN `deleted_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `company` ADD COLUMN `deleted_at` DATETIME(3) NULL;
