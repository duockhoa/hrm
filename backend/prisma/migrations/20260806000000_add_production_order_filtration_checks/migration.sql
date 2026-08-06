-- CreateTable
CREATE TABLE `production_order_filtration_checks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `filter_position` VARCHAR(255) NULL,
    `filter_membrane_id` INTEGER NULL,
    `pre_filter_appearance_requirement` TEXT NULL,
    `pre_filter_appearance_result` TEXT NULL,
    `pre_sterilization_integrity_requirement` TEXT NULL,
    `pre_sterilization_integrity_result` TEXT NULL,
    `sterilized_by_id` INTEGER NULL,
    `rinse_water_volume_liters` DECIMAL(12, 3) NULL,
    `filtering_started_at` DATETIME(3) NULL,
    `filtering_finished_at` DATETIME(3) NULL,
    `filtered_by_id` INTEGER NULL,
    `tank_residual_volume_liters` DECIMAL(12, 3) NULL,
    `post_filter_test_requirement` TEXT NULL,
    `post_filter_test_result` TEXT NULL,
    `post_filter_membrane_appearance_requirement` TEXT NULL,
    `post_filter_membrane_appearance_result` TEXT NULL,
    `inspected_after_filter_by_id` INTEGER NULL,

    INDEX `po_filtration_checks_po_id_fkey`(`production_order_id`),
    INDEX `po_filtration_checks_filter_membrane_id_fkey`(`filter_membrane_id`),
    INDEX `po_filtration_checks_sterilized_by_id_fkey`(`sterilized_by_id`),
    INDEX `po_filtration_checks_filtered_by_id_fkey`(`filtered_by_id`),
    INDEX `po_filtration_checks_inspected_by_id_fkey`(`inspected_after_filter_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `production_order_filtration_checks` ADD CONSTRAINT `po_filtration_checks_po_id_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_filtration_checks` ADD CONSTRAINT `po_filtration_checks_filter_membrane_id_fkey` FOREIGN KEY (`filter_membrane_id`) REFERENCES `filter_catalogs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_filtration_checks` ADD CONSTRAINT `po_filtration_checks_sterilized_by_id_fkey` FOREIGN KEY (`sterilized_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_filtration_checks` ADD CONSTRAINT `po_filtration_checks_filtered_by_id_fkey` FOREIGN KEY (`filtered_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_filtration_checks` ADD CONSTRAINT `po_filtration_checks_inspected_by_id_fkey` FOREIGN KEY (`inspected_after_filter_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
