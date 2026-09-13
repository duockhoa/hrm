ALTER TABLE `production_order_semi_finished_product_net_weight_checks`
  ADD COLUMN `lower_limit` DECIMAL(10, 3) NULL,
  ADD COLUMN `upper_limit` DECIMAL(10, 3) NULL;

ALTER TABLE `production_order_semi_finished_product_gross_weight_checks`
  ADD COLUMN `lower_limit` DECIMAL(10, 3) NULL,
  ADD COLUMN `upper_limit` DECIMAL(10, 3) NULL;

ALTER TABLE `production_order_volume_checks`
  ADD COLUMN `lower_limit` DECIMAL(10, 2) NULL,
  ADD COLUMN `upper_limit` DECIMAL(10, 2) NULL;
