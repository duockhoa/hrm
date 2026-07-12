ALTER TABLE `production_order_semi_finished_product_gross_weight_checks`
    ADD COLUMN `unit_7_gross_weight` DECIMAL(10, 3) NULL,
    ADD COLUMN `unit_8_gross_weight` DECIMAL(10, 3) NULL,
    ADD COLUMN `unit_9_gross_weight` DECIMAL(10, 3) NULL,
    ADD COLUMN `unit_10_gross_weight` DECIMAL(10, 3) NULL;

ALTER TABLE `production_order_semi_finished_product_net_weight_checks`
    ADD COLUMN `unit_7_net_weight` DECIMAL(10, 3) NULL,
    ADD COLUMN `unit_8_net_weight` DECIMAL(10, 3) NULL,
    ADD COLUMN `unit_9_net_weight` DECIMAL(10, 3) NULL,
    ADD COLUMN `unit_10_net_weight` DECIMAL(10, 3) NULL;
