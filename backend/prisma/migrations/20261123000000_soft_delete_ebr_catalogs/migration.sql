ALTER TABLE `filter_catalogs` ADD COLUMN `deleted_at` DATETIME(3) NULL;
ALTER TABLE `product_lines` ADD COLUMN `deleted_at` DATETIME(3) NULL;
ALTER TABLE `dosage_forms` ADD COLUMN `deleted_at` DATETIME(3) NULL;
