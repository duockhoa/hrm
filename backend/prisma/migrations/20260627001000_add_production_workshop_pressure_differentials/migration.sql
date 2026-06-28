CREATE TABLE `production_workshop_pressure_differentials` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `workshop_id` INTEGER NOT NULL,
    `gauge_name` VARCHAR(191) NOT NULL,
    `differential_pressure` INTEGER NOT NULL,
    `unit` VARCHAR(20) NOT NULL DEFAULT 'Pa',
    `conclusion` VARCHAR(50) NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `checked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pw_pressure_diff_workshop_id_fkey`(`workshop_id`),
    INDEX `pw_pressure_diff_created_by_id_fkey`(`created_by_id`),
    INDEX `pw_pressure_diff_checked_at_idx`(`checked_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `production_workshop_pressure_differentials` ADD CONSTRAINT `pw_pressure_diff_workshop_id_fkey` FOREIGN KEY (`workshop_id`) REFERENCES `production_workshops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `production_workshop_pressure_differentials` ADD CONSTRAINT `pw_pressure_diff_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
