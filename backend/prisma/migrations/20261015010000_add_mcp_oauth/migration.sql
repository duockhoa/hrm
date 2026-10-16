-- CreateTable
CREATE TABLE `oauth_clients` (
    `id` VARCHAR(128) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `secret_hash` VARCHAR(255) NOT NULL,
    `redirect_uris` JSON NOT NULL,
    `scopes` JSON NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `oauth_authorization_requests` (
    `request_hash` CHAR(64) NOT NULL,
    `csrf_hash` CHAR(64) NOT NULL,
    `client_id` VARCHAR(128) NOT NULL,
    `params` JSON NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `expires_at` DATETIME(3) NOT NULL,
    `consumed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `oauth_authorization_requests_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`request_hash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `oauth_grants` (
    `id` CHAR(36) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `client_id` VARCHAR(128) NOT NULL,
    `resource` VARCHAR(512) NOT NULL,
    `scopes` JSON NOT NULL,
    `revoked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `oauth_grants_user_id_revoked_at_idx`(`user_id`, `revoked_at`),
    INDEX `oauth_grants_client_id_idx`(`client_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `oauth_authorization_codes` (
    `code_hash` CHAR(64) NOT NULL,
    `grant_id` CHAR(36) NOT NULL,
    `redirect_uri` VARCHAR(2048) NOT NULL,
    `code_challenge` VARCHAR(128) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `consumed_at` DATETIME(3) NULL,

    INDEX `oauth_authorization_codes_grant_id_idx`(`grant_id`),
    INDEX `oauth_authorization_codes_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`code_hash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `oauth_tokens` (
    `access_hash` CHAR(64) NOT NULL,
    `refresh_hash` CHAR(64) NULL,
    `grant_id` CHAR(36) NOT NULL,
    `scopes` JSON NOT NULL,
    `access_expires_at` DATETIME(3) NOT NULL,
    `refresh_expires_at` DATETIME(3) NULL,
    `refresh_consumed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `oauth_tokens_refresh_hash_key`(`refresh_hash`),
    INDEX `oauth_tokens_grant_id_idx`(`grant_id`),
    INDEX `oauth_tokens_access_expires_at_idx`(`access_expires_at`),
    PRIMARY KEY (`access_hash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `oauth_authorization_requests` ADD CONSTRAINT `oauth_authorization_requests_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `oauth_clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oauth_grants` ADD CONSTRAINT `oauth_grants_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oauth_grants` ADD CONSTRAINT `oauth_grants_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `oauth_clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oauth_authorization_codes` ADD CONSTRAINT `oauth_authorization_codes_grant_id_fkey` FOREIGN KEY (`grant_id`) REFERENCES `oauth_grants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oauth_tokens` ADD CONSTRAINT `oauth_tokens_grant_id_fkey` FOREIGN KEY (`grant_id`) REFERENCES `oauth_grants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
