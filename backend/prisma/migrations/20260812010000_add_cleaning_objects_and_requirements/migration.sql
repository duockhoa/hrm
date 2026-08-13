-- CreateTable
CREATE TABLE `cleaning_objects` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `qr_code` VARCHAR(255) NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `cleaning_objects_qr_code_key`(`qr_code`),
    INDEX `cleaning_objects_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cleaning_requirements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cleaning_object_id` INTEGER NOT NULL,
    `requirement_type` VARCHAR(100) NOT NULL,
    `requirement_content` TEXT NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `cleaning_requirements_cleaning_object_id_idx`(`cleaning_object_id`),
    INDEX `cleaning_requirements_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `cleaning_objects` ADD CONSTRAINT `cleaning_objects_created_by_id_fkey`
  FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cleaning_requirements` ADD CONSTRAINT `cleaning_requirements_cleaning_object_id_fkey`
  FOREIGN KEY (`cleaning_object_id`) REFERENCES `cleaning_objects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cleaning_requirements` ADD CONSTRAINT `cleaning_requirements_created_by_id_fkey`
  FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
