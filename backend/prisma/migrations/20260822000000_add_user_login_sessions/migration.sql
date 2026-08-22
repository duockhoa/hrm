CREATE TABLE `user_login_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `token_id` INTEGER NULL,
    `session_key` VARCHAR(64) NOT NULL,
    `login_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `logout_at` DATETIME(3) NULL,
    `last_activity_at` DATETIME(3) NULL,
    `logout_reason` VARCHAR(30) NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(1000) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_login_sessions_session_key_key`(`session_key`),
    INDEX `user_login_sessions_user_login_at_idx`(`user_id`, `login_at`),
    INDEX `user_login_sessions_open_session_idx`(`user_id`, `logout_at`),
    INDEX `user_login_sessions_token_id_idx`(`token_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `user_login_sessions`
  ADD CONSTRAINT `user_login_sessions_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `user_login_sessions`
  ADD CONSTRAINT `user_login_sessions_token_id_fkey`
  FOREIGN KEY (`token_id`) REFERENCES `tokens`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
