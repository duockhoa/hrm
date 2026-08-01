CREATE TABLE `production_order_registration_numbers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `registration_id` INTEGER NULL,
    `registration_number` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `po_registration_numbers_po_id_key`(`production_order_id`),
    INDEX `po_registration_numbers_registration_id_idx`(`registration_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `production_order_registration_numbers`
    ADD CONSTRAINT `po_registration_numbers_po_id_fkey`
    FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `production_order_registration_numbers`
    ADD CONSTRAINT `po_registration_numbers_registration_id_fkey`
    FOREIGN KEY (`registration_id`) REFERENCES `registration_numbers`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
