ALTER TABLE `production_order_post_secondary_pending_process_items`
    ADD COLUMN `unit` VARCHAR(20) NULL;

ALTER TABLE `production_order_post_secondary_pending_cancellation_items`
    ADD COLUMN `unit` VARCHAR(20) NULL;
