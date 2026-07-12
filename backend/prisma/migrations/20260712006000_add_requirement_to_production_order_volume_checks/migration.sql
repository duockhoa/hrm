ALTER TABLE `production_order_volume_checks`
    ADD COLUMN `requirement` TEXT NULL AFTER `package_type`;
