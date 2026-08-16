CREATE TABLE `production_order_line_clearance_checks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `check_type` VARCHAR(100) NOT NULL,
    `requirement` TEXT NOT NULL,
    `result` VARCHAR(20) NOT NULL,
    `previous_production_order_id` INTEGER NULL,
    `previous_lot_no` VARCHAR(100) NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_line_clearance_checks_po_id_fkey`(`production_order_id`),
    INDEX `po_line_clearance_checks_previous_po_id_fkey`(`previous_production_order_id`),
    INDEX `po_line_clearance_checks_created_by_id_fkey`(`created_by_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `po_line_clearance_checks_po_id_fkey`
      FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `po_line_clearance_checks_previous_po_id_fkey`
      FOREIGN KEY (`previous_production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `po_line_clearance_checks_created_by_id_fkey`
      FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
