CREATE TABLE `email_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(100) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `email_types_code_key` (`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `email_default_recipients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email_type_id` INTEGER NOT NULL,
    `email` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `email_default_recipients_email_type_id_key` (`email_type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `email_user_recipients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `email_type_id` INTEGER NOT NULL,
    `email` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `email_user_recipients_user_id_email_type_id_key` (`user_id`, `email_type_id`),
    INDEX `email_user_recipients_email_type_id_idx` (`email_type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `email_default_recipients`
    ADD CONSTRAINT `email_default_recipients_email_type_id_fkey`
    FOREIGN KEY (`email_type_id`) REFERENCES `email_types` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `email_user_recipients`
    ADD CONSTRAINT `email_user_recipients_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `email_user_recipients_email_type_id_fkey`
    FOREIGN KEY (`email_type_id`) REFERENCES `email_types` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO `email_types` (`code`, `name`)
VALUES ('sampling_request', 'Phiếu yêu cầu lấy mẫu');

INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
VALUES
    ('email-settings.read', 'Xem cấu hình người nhận email mặc định', NOW(3), NOW(3)),
    ('email-settings.update', 'Quản lý loại email và người nhận email mặc định', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`), `updated_at` = VALUES(`updated_at`);
