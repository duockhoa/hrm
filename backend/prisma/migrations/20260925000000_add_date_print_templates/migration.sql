CREATE TABLE `date_print_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `item_code` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `description` TEXT NULL,
    `print_content` TEXT NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `image_path` TEXT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `date_print_templates_item_version_key`(`item_code`, `version`),
    INDEX `date_print_templates_item_code_idx`(`item_code`),
    INDEX `date_print_templates_status_idx`(`status`),
    INDEX `date_print_templates_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `date_print_templates`
    ADD CONSTRAINT `date_print_templates_item_code_fkey`
    FOREIGN KEY (`item_code`) REFERENCES `items`(`item_code`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `date_print_templates`
    ADD CONSTRAINT `date_print_templates_created_by_id_fkey`
    FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
VALUES
    ('date-print-templates.read', 'Xem template lệnh in date', NOW(3), NOW(3)),
    ('date-print-templates.create', 'Tạo template lệnh in date', NOW(3), NOW(3)),
    ('date-print-templates.update', 'Cập nhật template lệnh in date', NOW(3), NOW(3)),
    ('date-print-templates.delete', 'Xóa template lệnh in date', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
    `description` = VALUES(`description`),
    `updated_at` = VALUES(`updated_at`);
