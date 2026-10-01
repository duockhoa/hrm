CREATE TABLE `warehouse_receipt_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `item_code` VARCHAR(191) NOT NULL,
    `manufacturer_lot_number` VARCHAR(100) NULL,
    `lot_number` VARCHAR(100) NOT NULL,
    `expiry_date` DATE NULL,
    `packaging_specification` VARCHAR(255) NULL,
    `supplier_name` VARCHAR(255) NULL,
    `manufacturer_name` VARCHAR(255) NULL,
    `note` TEXT NULL,
    `entered_by_id` INTEGER NOT NULL,
    `received_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `warehouse_receipt_items_item_code_idx` (`item_code`),
    INDEX `warehouse_receipt_items_entered_by_id_idx` (`entered_by_id`),
    INDEX `warehouse_receipt_items_lot_number_idx` (`lot_number`),
    INDEX `warehouse_receipt_items_expiry_date_idx` (`expiry_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `warehouse_receipt_items`
    ADD CONSTRAINT `warehouse_receipt_items_item_code_fkey`
    FOREIGN KEY (`item_code`) REFERENCES `items` (`item_code`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `warehouse_receipt_items`
    ADD CONSTRAINT `warehouse_receipt_items_entered_by_id_fkey`
    FOREIGN KEY (`entered_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
VALUES
    ('warehouse-receipt-items.list', 'Xem danh sách hàng nhập kho', NOW(3), NOW(3)),
    ('warehouse-receipt-items.read', 'Xem chi tiết hàng nhập kho', NOW(3), NOW(3)),
    ('warehouse-receipt-items.create', 'Thêm hàng nhập kho', NOW(3), NOW(3)),
    ('warehouse-receipt-items.update', 'Sửa hàng nhập kho', NOW(3), NOW(3)),
    ('warehouse-receipt-items.delete', 'Xoá hàng nhập kho', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`), `updated_at` = VALUES(`updated_at`);
