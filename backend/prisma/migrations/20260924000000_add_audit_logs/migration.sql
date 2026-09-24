CREATE TABLE `audit_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `entity_type` VARCHAR(100) NOT NULL,
    `entity_id` BIGINT NOT NULL,
    `entity_name` VARCHAR(255) NULL,
    `action` VARCHAR(30) NOT NULL,
    `old_values` JSON NULL,
    `new_values` JSON NULL,
    `actor_id` BIGINT NULL,
    `actor_name` VARCHAR(255) NULL,
    `reason` TEXT NULL,
    `request_id` CHAR(36) NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_audit_logs_entity`(`entity_type`, `entity_id`, `created_at` DESC),
    INDEX `idx_audit_logs_actor`(`actor_id`, `created_at` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
