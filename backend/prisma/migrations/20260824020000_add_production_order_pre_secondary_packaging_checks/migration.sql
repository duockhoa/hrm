CREATE TABLE `production_order_pre_secondary_packaging_checks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `requirement` TEXT NOT NULL,
    `quantity_checked` INTEGER NOT NULL,
    `quantity_failed` INTEGER NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_pre_secondary_packaging_checks_po_id_fkey`(`production_order_id`),
    INDEX `po_pre_secondary_packaging_checks_created_by_id_fkey`(`created_by_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `po_pre_secondary_packaging_checks_po_id_fkey`
      FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `po_pre_secondary_packaging_checks_created_by_id_fkey`
      FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `production_order_pre_secondary_packaging_check_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `check_id` INTEGER NOT NULL,
    `image_path` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_pre_secondary_packaging_check_images_check_id_fkey`(`check_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `po_pre_secondary_packaging_check_images_check_id_fkey`
      FOREIGN KEY (`check_id`) REFERENCES `production_order_pre_secondary_packaging_checks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
