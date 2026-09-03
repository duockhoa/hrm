-- CreateTable
CREATE TABLE `production_order_ten_unit_sensory_check_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ten_unit_sensory_check_id` INTEGER NOT NULL,
    `image_path` TEXT NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_ten_unit_sensory_check_images_check_idx`(`ten_unit_sensory_check_id`),
    INDEX `po_ten_unit_sensory_check_images_user_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `production_order_ten_unit_sensory_check_images` ADD CONSTRAINT `po_ten_unit_sensory_check_images_check_id_fkey` FOREIGN KEY (`ten_unit_sensory_check_id`) REFERENCES `production_order_ten_unit_sensory_checks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_ten_unit_sensory_check_images` ADD CONSTRAINT `po_ten_unit_sensory_check_images_user_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
