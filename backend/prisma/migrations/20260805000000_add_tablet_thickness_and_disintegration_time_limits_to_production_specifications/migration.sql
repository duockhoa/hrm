ALTER TABLE `production_specifications`
    ADD COLUMN `tablet_thickness_control_limit` DECIMAL(18, 6) NULL AFTER `hardness_unit`,
    ADD COLUMN `tablet_thickness_allowed_limit` DECIMAL(18, 6) NULL AFTER `tablet_thickness_control_limit`,
    ADD COLUMN `tablet_thickness_unit` VARCHAR(20) NOT NULL DEFAULT 'mm' AFTER `tablet_thickness_allowed_limit`,
    ADD COLUMN `disintegration_time_control_limit` DECIMAL(18, 6) NULL AFTER `tablet_thickness_unit`,
    ADD COLUMN `disintegration_time_allowed_limit` DECIMAL(18, 6) NULL AFTER `disintegration_time_control_limit`,
    ADD COLUMN `disintegration_time_unit` VARCHAR(20) NOT NULL DEFAULT 'phút' AFTER `disintegration_time_allowed_limit`;
