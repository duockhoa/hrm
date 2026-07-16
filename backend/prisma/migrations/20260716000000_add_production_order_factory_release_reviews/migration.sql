-- CreateTable
CREATE TABLE `production_order_factory_release_reviews` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `approved_by_id` INTEGER NULL,
    `registration_number` VARCHAR(191) NOT NULL,
    `raw_material_test_result` TEXT NULL,
    `water_test_result` TEXT NULL,
    `compressed_air_test_result` TEXT NULL,
    `filter_integrity_test_result` TEXT NULL,
    `packaging_inspection_result` TEXT NULL,
    `finished_product_test_result` TEXT NULL,
    `sterilization_result` TEXT NULL,
    `online_particle_result` TEXT NULL,
    `yield_quantity` TEXT NULL,
    `deviation` TEXT NULL,
    `environment_monitoring_result` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_factory_release_reviews_po_id_fkey`(`production_order_id`),
    INDEX `po_factory_release_reviews_approved_by_id_fkey`(`approved_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `production_order_factory_release_reviews` ADD CONSTRAINT `po_factory_release_reviews_po_id_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_factory_release_reviews` ADD CONSTRAINT `po_factory_release_reviews_approved_by_id_fkey` FOREIGN KEY (`approved_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
