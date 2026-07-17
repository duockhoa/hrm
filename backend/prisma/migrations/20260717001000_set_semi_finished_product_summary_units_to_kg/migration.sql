UPDATE `production_order_semi_finished_product_summaries`
SET
    `input_unit` = 'kg',
    `packed_unit` = 'kg',
    `leftover_unit` = 'kg',
    `waste_unit` = 'kg';

ALTER TABLE `production_order_semi_finished_product_summaries`
    MODIFY `input_unit` VARCHAR(20) NOT NULL DEFAULT 'kg',
    MODIFY `packed_unit` VARCHAR(20) NOT NULL DEFAULT 'kg',
    MODIFY `leftover_unit` VARCHAR(20) NOT NULL DEFAULT 'kg',
    MODIFY `waste_unit` VARCHAR(20) NOT NULL DEFAULT 'kg';
