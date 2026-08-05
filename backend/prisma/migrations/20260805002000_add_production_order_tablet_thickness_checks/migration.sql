CREATE TABLE `production_order_tablet_thickness_checks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `requirement` TEXT NULL,
    `dosage_form_stage` VARCHAR(50) NULL,
    `unit_1_thickness` DECIMAL(10, 3) NOT NULL,
    `unit_2_thickness` DECIMAL(10, 3) NULL,
    `unit_3_thickness` DECIMAL(10, 3) NULL,
    `unit_4_thickness` DECIMAL(10, 3) NULL,
    `unit_5_thickness` DECIMAL(10, 3) NULL,
    `unit_6_thickness` DECIMAL(10, 3) NULL,
    `unit_7_thickness` DECIMAL(10, 3) NULL,
    `unit_8_thickness` DECIMAL(10, 3) NULL,
    `unit_9_thickness` DECIMAL(10, 3) NULL,
    `unit_10_thickness` DECIMAL(10, 3) NULL,
    `unit` VARCHAR(10) NOT NULL DEFAULT 'mm',
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    INDEX `po_tablet_thickness_checks_po_idx`(`production_order_id`),
    INDEX `po_tablet_thickness_checks_user_idx`(`created_by_id`),
    CONSTRAINT `po_tablet_thickness_checks_po_fkey`
      FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `po_tablet_thickness_checks_user_fkey`
      FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
);
