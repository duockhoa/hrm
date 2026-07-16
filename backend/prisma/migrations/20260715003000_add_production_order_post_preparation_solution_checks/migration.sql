-- CreateTable
CREATE TABLE `production_order_post_preparation_solution_checks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `final_volume_image_path` TEXT NULL,
    `solution_color` TEXT NULL,
    `solution_image_path` TEXT NULL,
    `solution_clarity` TEXT NULL,
    `solution_ph` DECIMAL(5, 2) NULL,
    `checked_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_post_preparation_solution_checks_po_id_fkey`(`production_order_id`),
    INDEX `po_post_preparation_solution_checks_checked_by_id_fkey`(`checked_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `production_order_post_preparation_solution_checks` ADD CONSTRAINT `po_post_preparation_solution_checks_po_id_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_post_preparation_solution_checks` ADD CONSTRAINT `po_post_preparation_solution_checks_checked_by_id_fkey` FOREIGN KEY (`checked_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
