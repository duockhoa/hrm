-- Add the foreign-key column before removing the legacy text column.
ALTER TABLE `production_specifications`
    ADD COLUMN `dosage_form_id` INTEGER NULL AFTER `product_line_id`;

-- Preserve existing dosage-form values by creating catalog rows where needed.
-- Production specifications created through the API have updated_by_id populated;
-- the first existing user is used only as a fallback for legacy rows.
INSERT INTO `dosage_forms` (`name`, `created_by_id`, `created_at`, `updated_at`)
SELECT
    TRIM(`dosage_form`) AS `name`,
    COALESCE(MIN(`updated_by_id`), (SELECT MIN(`id`) FROM `users`)) AS `created_by_id`,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
FROM `production_specifications`
WHERE `dosage_form` IS NOT NULL
  AND TRIM(`dosage_form`) <> ''
GROUP BY TRIM(`dosage_form`)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Map each legacy name to its catalog record before dropping the old column.
UPDATE `production_specifications` AS `specification`
INNER JOIN `dosage_forms` AS `dosage_form`
    ON `dosage_form`.`name` = TRIM(`specification`.`dosage_form`)
SET `specification`.`dosage_form_id` = `dosage_form`.`id`
WHERE `specification`.`dosage_form` IS NOT NULL
  AND TRIM(`specification`.`dosage_form`) <> '';

ALTER TABLE `production_specifications`
    DROP COLUMN `dosage_form`,
    ADD INDEX `production_specifications_dosage_form_id_idx` (`dosage_form_id`),
    ADD CONSTRAINT `production_specifications_dosage_form_id_fkey`
      FOREIGN KEY (`dosage_form_id`) REFERENCES `dosage_forms`(`id`)
      ON DELETE SET NULL ON UPDATE CASCADE;
