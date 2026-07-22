ALTER TABLE `production_order_semi_finished_product_summaries`
    ADD COLUMN `load_quantity` DECIMAL(12, 3) NULL AFTER `input_unit`,
    ADD COLUMN `load_unit` VARCHAR(20) NOT NULL DEFAULT 'kg' AFTER `load_quantity`;
