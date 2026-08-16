CREATE TABLE `secondary_packaging_stage_requirements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stage` VARCHAR(100) NOT NULL,
    `requirement` TEXT NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `secondary_packaging_stage_requirements_stage_idx`(`stage`),
    INDEX `secondary_packaging_stage_requirements_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `secondary_packaging_stage_requirements_created_by_id_fkey`
      FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
