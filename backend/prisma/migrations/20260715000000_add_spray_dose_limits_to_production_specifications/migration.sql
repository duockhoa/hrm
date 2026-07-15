-- AlterTable
ALTER TABLE `production_specifications`
    ADD COLUMN `spray_dose_lower_allowed_limit` DECIMAL(18, 6) NULL,
    ADD COLUMN `spray_dose_upper_allowed_limit` DECIMAL(18, 6) NULL,
    ADD COLUMN `spray_dose_lower_control_limit` DECIMAL(18, 6) NULL,
    ADD COLUMN `spray_dose_upper_control_limit` DECIMAL(18, 6) NULL;
