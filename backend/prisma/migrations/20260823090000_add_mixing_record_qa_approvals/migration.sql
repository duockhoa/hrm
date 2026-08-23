ALTER TABLE `production_order_mixing_records`
    ADD COLUMN `qa_staff_approved_by_id` INTEGER NULL,
    ADD COLUMN `qa_staff_approved_at` DATETIME(3) NULL,
    ADD COLUMN `qa_manager_approved_by_id` INTEGER NULL,
    ADD COLUMN `qa_manager_approved_at` DATETIME(3) NULL,
    ADD INDEX `po_mixing_records_qa_staff_approved_by_idx` (`qa_staff_approved_by_id`),
    ADD INDEX `po_mixing_records_qa_manager_approved_by_idx` (`qa_manager_approved_by_id`),
    ADD CONSTRAINT `po_mixing_records_qa_staff_approved_by_fkey`
        FOREIGN KEY (`qa_staff_approved_by_id`) REFERENCES `users`(`id`)
        ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `po_mixing_records_qa_manager_approved_by_fkey`
        FOREIGN KEY (`qa_manager_approved_by_id`) REFERENCES `users`(`id`)
        ON DELETE SET NULL ON UPDATE CASCADE;
