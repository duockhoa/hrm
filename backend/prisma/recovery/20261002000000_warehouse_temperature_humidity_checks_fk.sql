-- Recovery for P3018 / MySQL 1824 at statement 2 of this migration.
-- Run only after verifying that the table exists and this foreign key is absent.
-- Complete the missing step without recreating the table or deleting data.
ALTER TABLE `warehouse_temperature_humidity_checks`
ADD CONSTRAINT `warehouse_temperature_humidity_checks_checked_by_id_fkey`
FOREIGN KEY (`checked_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
