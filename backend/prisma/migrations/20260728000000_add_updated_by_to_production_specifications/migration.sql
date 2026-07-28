ALTER TABLE `production_specifications`
    ADD COLUMN `updated_by_id` INTEGER NULL;

CREATE INDEX `production_specifications_updated_by_id_idx`
    ON `production_specifications`(`updated_by_id`);

ALTER TABLE `production_specifications`
    ADD CONSTRAINT `production_specifications_updated_by_id_fkey`
    FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
