ALTER TABLE `production_specifications`
    ADD COLUMN `lower_control_limit_operator` VARCHAR(2) NULL AFTER `lower_control_limit`,
    ADD COLUMN `upper_control_limit_operator` VARCHAR(2) NULL AFTER `upper_control_limit`,
    ADD COLUMN `lower_allowed_limit_operator` VARCHAR(2) NULL AFTER `lower_allowed_limit`,
    ADD COLUMN `upper_allowed_limit_operator` VARCHAR(2) NULL AFTER `upper_allowed_limit`;
