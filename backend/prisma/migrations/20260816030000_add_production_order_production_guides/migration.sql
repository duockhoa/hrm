CREATE TABLE `production_order_production_guides` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `original_filename` VARCHAR(255) NOT NULL,
    `file_path` TEXT NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `file_size` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `po_production_guides_po_id_key`(`production_order_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `po_production_guides_po_id_fkey`
      FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
