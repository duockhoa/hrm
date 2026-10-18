ALTER TABLE `roles` ADD COLUMN `production_order_read_limit` INTEGER NULL DEFAULT 300;

-- Existing regular roles receive the default; administrators retain full access.
UPDATE `roles` SET `production_order_read_limit` = NULL WHERE LOWER(TRIM(`name`)) = 'admin';
