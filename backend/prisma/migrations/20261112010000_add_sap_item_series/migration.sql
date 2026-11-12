CREATE TABLE `sap_item_series` (
    `series` INTEGER NOT NULL,
    `document` VARCHAR(20) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `prefix` VARCHAR(255) NULL,
    `suffix` VARCHAR(255) NULL,
    `is_manual` BOOLEAN NULL,
    `is_locked` BOOLEAN NULL,
    `raw_data` JSON NOT NULL,
    `synced_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`series`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
