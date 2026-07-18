-- AlterTable
ALTER TABLE `production_specifications`
    ADD COLUMN `film_coated_tablet_weight_lower_control_limit` DECIMAL(18, 6) NULL,
    ADD COLUMN `film_coated_tablet_weight_upper_control_limit` DECIMAL(18, 6) NULL,
    ADD COLUMN `film_coated_tablet_weight_lower_allowed_limit` DECIMAL(18, 6) NULL,
    ADD COLUMN `film_coated_tablet_weight_upper_allowed_limit` DECIMAL(18, 6) NULL,
    ADD COLUMN `film_coated_tablet_weight_unit` VARCHAR(20) NULL;
