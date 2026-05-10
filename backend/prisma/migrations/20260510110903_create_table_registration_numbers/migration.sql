-- AlterTable
ALTER TABLE `items` ADD COLUMN `registration_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `registration_numbers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `registration_number` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `registration_numbers_registration_number_key`(`registration_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `items` ADD CONSTRAINT `items_registration_id_fkey` FOREIGN KEY (`registration_id`) REFERENCES `registration_numbers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
