ALTER TABLE `production_workshop_pressure_differentials` DROP INDEX `pw_pressure_diff_checked_at_idx`;

ALTER TABLE `production_workshop_pressure_differentials` DROP COLUMN `checked_at`;
