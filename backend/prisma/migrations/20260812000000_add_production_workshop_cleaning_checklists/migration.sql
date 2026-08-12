-- CreateTable
CREATE TABLE `production_workshop_cleaning_checklists` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `workshop_id` INTEGER NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `requirement` TEXT NOT NULL,
    `result` VARCHAR(100) NOT NULL,
    `note` TEXT NULL,
    `cleaned_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pw_cleaning_checklists_workshop_id_fkey`(`workshop_id`),
    INDEX `pw_cleaning_checklists_cleaned_by_id_fkey`(`cleaned_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `production_workshop_cleaning_checklists` ADD CONSTRAINT `pw_cleaning_checklists_workshop_id_fkey` FOREIGN KEY (`workshop_id`) REFERENCES `production_workshops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_workshop_cleaning_checklists` ADD CONSTRAINT `pw_cleaning_checklists_cleaned_by_id_fkey` FOREIGN KEY (`cleaned_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
