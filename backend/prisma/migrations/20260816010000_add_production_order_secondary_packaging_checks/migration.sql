CREATE TABLE `production_order_secondary_packaging_checks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `stage` VARCHAR(100) NOT NULL,
    `requirement` TEXT NOT NULL,
    `quantity_checked` INTEGER NOT NULL,
    `quantity_passed` INTEGER NOT NULL,
    `checked_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_secondary_packaging_checks_po_id_fkey`(`production_order_id`),
    INDEX `po_secondary_packaging_checks_checked_by_id_fkey`(`checked_by_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `po_secondary_packaging_checks_po_id_fkey`
      FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `po_secondary_packaging_checks_checked_by_id_fkey`
      FOREIGN KEY (`checked_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
