ALTER TABLE `production_order_disintegration_checks`
    ADD COLUMN `requirement` TEXT NULL AFTER `production_order_id`;
