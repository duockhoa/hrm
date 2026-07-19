CREATE TABLE `equipment_monitoring_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `equipment_id` INTEGER NOT NULL,
    `recorded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `note` TEXT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    INDEX `equipment_monitoring_records_po_id_idx`(`production_order_id`),
    INDEX `equipment_monitoring_records_equipment_id_idx`(`equipment_id`),
    INDEX `equipment_monitoring_records_po_equipment_recorded_idx`(`production_order_id`, `equipment_id`, `recorded_at`),
    INDEX `equipment_monitoring_records_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `equipment_monitoring_values` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `record_id` INTEGER NOT NULL,
    `parameter_id` INTEGER NOT NULL,
    `value` TEXT NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `equipment_monitoring_values_record_parameter_key`(`record_id`, `parameter_id`),
    INDEX `equipment_monitoring_values_parameter_id_idx`(`parameter_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `equipment_monitoring_records`
    ADD CONSTRAINT `equipment_monitoring_records_po_id_fkey`
    FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `equipment_monitoring_records`
    ADD CONSTRAINT `equipment_monitoring_records_equipment_id_fkey`
    FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `equipment_monitoring_records`
    ADD CONSTRAINT `equipment_monitoring_records_created_by_id_fkey`
    FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `equipment_monitoring_values`
    ADD CONSTRAINT `equipment_monitoring_values_record_id_fkey`
    FOREIGN KEY (`record_id`) REFERENCES `equipment_monitoring_records`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `equipment_monitoring_values`
    ADD CONSTRAINT `equipment_monitoring_values_parameter_id_fkey`
    FOREIGN KEY (`parameter_id`) REFERENCES `equipment_parameters`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
