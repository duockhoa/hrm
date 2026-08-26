ALTER TABLE `production_order_mixing_records`
    DROP FOREIGN KEY `po_mixing_records_qa_manager_approved_by_fkey`,
    RENAME INDEX `po_mixing_records_qa_manager_approved_by_idx` TO `po_mixing_records_ipc_staff_approved_by_idx`,
    CHANGE COLUMN `qa_manager_approved_by_id` `ipc_staff_approved_by_id` INTEGER NULL,
    CHANGE COLUMN `qa_manager_approved_at` `ipc_staff_approved_at` DATETIME(3) NULL,
    ADD CONSTRAINT `po_mixing_records_ipc_staff_approved_by_fkey`
        FOREIGN KEY (`ipc_staff_approved_by_id`) REFERENCES `users`(`id`)
        ON DELETE SET NULL ON UPDATE CASCADE;
