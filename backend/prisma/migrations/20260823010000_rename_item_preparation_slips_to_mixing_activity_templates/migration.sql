ALTER TABLE `item_preparation_slips`
    DROP FOREIGN KEY `item_preparation_slips_item_code_fkey`,
    DROP FOREIGN KEY `item_preparation_slips_created_by_id_fkey`;

RENAME TABLE `item_preparation_slips` TO `mixing_activity_templates`;

ALTER TABLE `mixing_activity_templates`
    RENAME INDEX `item_preparation_slips_item_code_idx` TO `mixing_activity_templates_item_code_idx`,
    RENAME INDEX `item_preparation_slips_created_by_id_idx` TO `mixing_activity_templates_created_by_id_idx`,
    ADD CONSTRAINT `mixing_activity_templates_item_code_fkey`
        FOREIGN KEY (`item_code`) REFERENCES `items`(`item_code`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `mixing_activity_templates_created_by_id_fkey`
        FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE;
