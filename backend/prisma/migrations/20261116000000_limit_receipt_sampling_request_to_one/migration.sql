-- Each warehouse receipt item can have only one sampling request.
-- Add the unique index before removing the index used by the receipt foreign key.
-- Duplicate receipt IDs cause this statement to fail; no existing requests are deleted.
ALTER TABLE `warehouse_receipt_item_sampling_requests`
    ADD UNIQUE INDEX `receipt_sampling_requests_receipt_key` (`warehouse_receipt_item_id`),
    DROP INDEX `receipt_sampling_requests_receipt_idx`,
    DROP COLUMN `status`;
