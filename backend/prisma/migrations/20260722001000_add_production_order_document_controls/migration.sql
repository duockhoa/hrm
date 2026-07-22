CREATE TABLE `production_order_document_controls` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `batch_record_issued_by_id` INTEGER NULL,
    `batch_record_issued_at` DATETIME(3) NULL,
    `batch_record_received_by_id` INTEGER NULL,
    `batch_record_received_at` DATETIME(3) NULL,
    `test_certificate_received_by_id` INTEGER NULL,
    `test_certificate_received_at` DATETIME(3) NULL,
    `warehouse_release_received_by_id` INTEGER NULL,
    `warehouse_release_received_at` DATETIME(3) NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `po_document_controls_po_id_key`(`production_order_id`),
    INDEX `po_document_controls_batch_record_issued_by_idx`(`batch_record_issued_by_id`),
    INDEX `po_document_controls_batch_record_received_by_idx`(`batch_record_received_by_id`),
    INDEX `po_document_controls_test_certificate_received_by_idx`(`test_certificate_received_by_id`),
    INDEX `po_document_controls_warehouse_release_received_by_idx`(`warehouse_release_received_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `production_order_document_controls`
    ADD CONSTRAINT `po_document_controls_po_id_fkey`
        FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `po_document_controls_batch_record_issued_by_fkey`
        FOREIGN KEY (`batch_record_issued_by_id`) REFERENCES `users`(`id`)
        ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `po_document_controls_batch_record_received_by_fkey`
        FOREIGN KEY (`batch_record_received_by_id`) REFERENCES `users`(`id`)
        ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `po_document_controls_test_certificate_received_by_fkey`
        FOREIGN KEY (`test_certificate_received_by_id`) REFERENCES `users`(`id`)
        ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `po_document_controls_warehouse_release_received_by_fkey`
        FOREIGN KEY (`warehouse_release_received_by_id`) REFERENCES `users`(`id`)
        ON DELETE SET NULL ON UPDATE CASCADE;
