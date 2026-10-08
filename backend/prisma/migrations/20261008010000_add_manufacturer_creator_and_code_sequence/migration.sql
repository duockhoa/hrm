-- Existing manufacturers have no known creator; preserve them with NULL.
ALTER TABLE `manufacturers` ADD COLUMN `created_by_id` INTEGER NULL;
CREATE INDEX `manufacturers_created_by_id_idx` ON `manufacturers`(`created_by_id`);
ALTER TABLE `manufacturers` ADD CONSTRAINT `manufacturers_created_by_id_fkey`
    FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE `manufacturer_code_sequence` (
    `id` INTEGER NOT NULL,
    `last_number` INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Continue from existing numeric NSX codes, including earlier NSX001-style codes.
INSERT INTO `manufacturer_code_sequence` (`id`, `last_number`)
SELECT 1, COALESCE(MAX(CAST(SUBSTRING(`manufacturer_code`, 4) AS UNSIGNED)), 0)
FROM `manufacturers`
WHERE `manufacturer_code` REGEXP '^NSX[0-9]+$';
