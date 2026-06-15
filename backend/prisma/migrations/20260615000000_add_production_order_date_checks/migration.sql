-- CreateTable
CREATE TABLE `production_order_date_checks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `package_type` VARCHAR(191) NOT NULL,
    `request_file_path` TEXT NULL,
    `approval_status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `created_by_id` INTEGER NOT NULL,
    `approved_by_id` INTEGER NULL,
    `checked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_date_checks_po_id_fkey`(`production_order_id`),
    INDEX `po_date_checks_created_by_id_fkey`(`created_by_id`),
    INDEX `po_date_checks_approved_by_id_fkey`(`approved_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `production_order_date_check_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date_check_id` INTEGER NOT NULL,
    `image_path` TEXT NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_date_check_images_check_id_fkey`(`date_check_id`),
    INDEX `po_date_check_images_created_by_id_fkey`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `production_order_date_checks` ADD CONSTRAINT `po_date_checks_po_id_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_date_checks` ADD CONSTRAINT `po_date_checks_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_date_checks` ADD CONSTRAINT `po_date_checks_approved_by_id_fkey` FOREIGN KEY (`approved_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_date_check_images` ADD CONSTRAINT `po_date_check_images_check_id_fkey` FOREIGN KEY (`date_check_id`) REFERENCES `production_order_date_checks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_date_check_images` ADD CONSTRAINT `po_date_check_images_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
