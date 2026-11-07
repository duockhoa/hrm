CREATE TABLE `user_ebr_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `client_session_id` CHAR(36) NOT NULL,
    `active_key` VARCHAR(80) NULL,
    `connection_key` CHAR(36) NOT NULL,
    `socket_id` VARCHAR(64) NOT NULL,
    `connected_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_seen_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `disconnected_at` DATETIME(3) NULL,
    `ended_at` DATETIME(3) NULL,
    `disconnect_reason` VARCHAR(100) NULL,
    `end_reason` VARCHAR(30) NULL,
    `connection_count` INTEGER NOT NULL DEFAULT 1,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(1000) NULL,

    UNIQUE INDEX `user_ebr_sessions_active_key_key` (`active_key`),
    INDEX `user_ebr_sessions_user_connected_idx` (`user_id`, `connected_at`),
    INDEX `user_ebr_sessions_connected_idx` (`connected_at`, `id`),
    INDEX `user_ebr_sessions_stale_idx` (`ended_at`, `disconnected_at`, `last_seen_at`),
    PRIMARY KEY (`id`),
    CONSTRAINT `user_ebr_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
