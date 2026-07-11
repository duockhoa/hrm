CREATE TABLE `production_order_semi_finished_product_net_weight_checks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `requirement` TEXT NOT NULL,
    `unit_1_net_weight` DECIMAL(10, 3) NOT NULL,
    `unit_2_net_weight` DECIMAL(10, 3) NULL,
    `unit_3_net_weight` DECIMAL(10, 3) NULL,
    `unit_4_net_weight` DECIMAL(10, 3) NULL,
    `unit_5_net_weight` DECIMAL(10, 3) NULL,
    `unit_6_net_weight` DECIMAL(10, 3) NULL,
    `unit` VARCHAR(10) NOT NULL DEFAULT 'g',
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    CONSTRAINT `po_semi_finished_net_weight_po_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `po_semi_finished_net_weight_user_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
