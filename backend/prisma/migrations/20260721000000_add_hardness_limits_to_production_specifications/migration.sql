ALTER TABLE `production_specifications`
    ADD COLUMN `hardness_lower_control_limit` DECIMAL(18, 6) NULL AFTER `film_coated_tablet_weight_unit`,
    ADD COLUMN `hardness_upper_control_limit` DECIMAL(18, 6) NULL AFTER `hardness_lower_control_limit`,
    ADD COLUMN `hardness_lower_allowed_limit` DECIMAL(18, 6) NULL AFTER `hardness_upper_control_limit`,
    ADD COLUMN `hardness_upper_allowed_limit` DECIMAL(18, 6) NULL AFTER `hardness_lower_allowed_limit`,
    ADD COLUMN `hardness_unit` VARCHAR(20) NOT NULL DEFAULT 'N' AFTER `hardness_upper_allowed_limit`;
