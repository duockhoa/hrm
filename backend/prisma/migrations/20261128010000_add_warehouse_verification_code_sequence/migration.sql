CREATE TABLE `warehouse_verification_code_sequence` (
    `id` INTEGER NOT NULL,
    `last_number` BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `warehouse_verification_code_sequence` (`id`, `last_number`)
SELECT 1, COALESCE(MAX(CAST(SUBSTRING(`record_code`, 5) AS UNSIGNED)), 0)
FROM `warehouse_verification_records`
WHERE `record_code` REGEXP '^BMXM[0-9]{1,18}$';
