CREATE TABLE `equipment_parameters` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `equipment_id` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `data_type` VARCHAR(50) NOT NULL,
    `unit` VARCHAR(50) NULL,
    `is_required` BOOLEAN NOT NULL DEFAULT true,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `equipment_parameters_equipment_name_key`(`equipment_id`, `name`),
    INDEX `equipment_parameters_equipment_id_idx`(`equipment_id`),
    INDEX `equipment_parameters_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `equipment_parameters`
    ADD CONSTRAINT `equipment_parameters_equipment_id_fkey`
    FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `equipment_parameters`
    ADD CONSTRAINT `equipment_parameters_created_by_id_fkey`
    FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
