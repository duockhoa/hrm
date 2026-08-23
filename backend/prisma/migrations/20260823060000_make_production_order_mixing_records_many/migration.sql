ALTER TABLE `production_order_mixing_records`
    DROP INDEX `po_mixing_records_order_id_key`,
    ADD INDEX `po_mixing_records_order_id_idx`(`production_order_id`);
