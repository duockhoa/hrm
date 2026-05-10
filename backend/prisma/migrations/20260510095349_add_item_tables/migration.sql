-- CreateTable
CREATE TABLE `items` (
    `item_code` VARCHAR(191) NOT NULL,
    `item_name` TEXT NOT NULL,
    `unit` VARCHAR(191) NULL,
    `dk_code` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`item_code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
