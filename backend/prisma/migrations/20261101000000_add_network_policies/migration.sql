CREATE TABLE `network_policies` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(20) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  UNIQUE INDEX `network_policies_code_key` (`code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `network_policies` (`code`, `name`) VALUES
  ('OPEN', 'Mở'), ('IP_ALLOWLIST', 'Theo IP');

CREATE TABLE `network_policy_ranges` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `policy_code` VARCHAR(20) NOT NULL DEFAULT 'IP_ALLOWLIST',
  `name` VARCHAR(100) NOT NULL,
  `cidr` VARCHAR(50) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `network_policy_ranges_policy_code_cidr_key` (`policy_code`, `cidr`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `users` ADD COLUMN `network_policy_code` VARCHAR(20) NOT NULL DEFAULT 'OPEN';
ALTER TABLE `users` ADD CONSTRAINT `users_network_policy_code_fkey`
  FOREIGN KEY (`network_policy_code`) REFERENCES `network_policies` (`code`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `network_policy_ranges` ADD CONSTRAINT `network_policy_ranges_policy_code_fkey`
  FOREIGN KEY (`policy_code`) REFERENCES `network_policies` (`code`) ON DELETE RESTRICT ON UPDATE CASCADE;
