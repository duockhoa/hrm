-- AlterTable
ALTER TABLE `production_order_spray_dose_checks`
    ADD COLUMN `requirement` TEXT NULL,
    ADD COLUMN `bottle_5_spray_dose_count` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `bottle_6_spray_dose_count` INTEGER NOT NULL DEFAULT 1;

ALTER TABLE `production_order_spray_dose_checks`
    ALTER COLUMN `bottle_5_spray_dose_count` DROP DEFAULT,
    ALTER COLUMN `bottle_6_spray_dose_count` DROP DEFAULT;
