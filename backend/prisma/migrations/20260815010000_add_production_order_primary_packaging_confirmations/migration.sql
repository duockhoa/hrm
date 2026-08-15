CREATE TABLE `production_order_primary_packaging_confirmations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `volume_weight_checked` BOOLEAN NOT NULL DEFAULT false,
    `sensory_checked` BOOLEAN NOT NULL DEFAULT false,
    `date_print_checked` BOOLEAN NOT NULL DEFAULT false,
    `hygiene_checked` BOOLEAN NOT NULL DEFAULT false,
    `seal_integrity_checked` BOOLEAN NOT NULL DEFAULT false,
    `note` TEXT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_primary_packaging_confirmations_po_id_idx`(`production_order_id`),
    INDEX `po_primary_packaging_confirmations_created_by_idx`(`created_by_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `po_primary_packaging_confirmations_po_id_fkey`
      FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `po_primary_packaging_confirmations_created_by_fkey`
      FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
);
