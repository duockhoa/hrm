CREATE TABLE `filter_catalogs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `filter_code` VARCHAR(50) NOT NULL,
    `filter_type` VARCHAR(100) NOT NULL,
    `usable_steam_cycles` INTEGER NULL,
    `description` TEXT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `filter_catalogs_filter_code_key`(`filter_code`),
    INDEX `filter_catalogs_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `filter_catalogs_created_by_id_fkey`
      FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
);
