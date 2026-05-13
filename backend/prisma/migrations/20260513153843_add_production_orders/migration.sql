-- CreateTable
CREATE TABLE `production_orders` (
    `id` INTEGER NOT NULL,
    `item_code` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `planned_quatity` INTEGER NOT NULL,
    `creation_date` DATETIME(3) NOT NULL,
    `origin` VARCHAR(191) NULL,
    `warehouse` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `date_manufacture` VARCHAR(191) NULL,
    `expire_date` VARCHAR(191) NULL,
    `lot_no` VARCHAR(191) NOT NULL,
    `packing_specification` VARCHAR(191) NULL,
    `production_order_code` VARCHAR(191) NULL,

    INDEX `production_orders_item_code_fkey`(`item_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `production_orders` ADD CONSTRAINT `production_orders_item_code_fkey` FOREIGN KEY (`item_code`) REFERENCES `items`(`item_code`) ON DELETE RESTRICT ON UPDATE CASCADE;
