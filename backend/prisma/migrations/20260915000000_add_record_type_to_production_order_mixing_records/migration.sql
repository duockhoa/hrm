ALTER TABLE `production_order_mixing_records`
    ADD COLUMN `record_type` VARCHAR(50) NOT NULL DEFAULT 'mixing' AFTER `template_version`;
