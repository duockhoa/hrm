-- CreateTable
CREATE TABLE `production_order_weighing_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `record_code` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'draft',
    `created_by_id` INTEGER NOT NULL,
    `qa_staff_approved_by_id` INTEGER NULL,
    `qa_staff_approved_at` DATETIME(3) NULL,
    `ipc_staff_approved_by_id` INTEGER NULL,
    `ipc_staff_approved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `po_weighing_records_code_key`(`record_code`),
    INDEX `po_weighing_records_order_idx`(`production_order_id`, `created_at`, `id`),
    INDEX `po_weighing_records_creator_idx`(`created_by_id`),
    INDEX `po_weighing_records_qa_idx`(`qa_staff_approved_by_id`),
    INDEX `po_weighing_records_ipc_idx`(`ipc_staff_approved_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `production_order_weighing_records` ADD CONSTRAINT `po_weighing_records_order_id_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_weighing_records` ADD CONSTRAINT `po_weighing_records_creator_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_weighing_records` ADD CONSTRAINT `po_weighing_records_qa_fkey` FOREIGN KEY (`qa_staff_approved_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_weighing_records` ADD CONSTRAINT `po_weighing_records_ipc_fkey` FOREIGN KEY (`ipc_staff_approved_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

