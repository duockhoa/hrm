CREATE TABLE `feature_section_actions` (
  `section_id` INTEGER NOT NULL,
  `action_id` INTEGER NOT NULL,
  `order` INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (`section_id`, `action_id`),
  INDEX `feature_section_actions_action_id_idx` (`action_id`),
  CONSTRAINT `feature_section_actions_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `features` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `feature_section_actions_action_id_fkey` FOREIGN KEY (`action_id`) REFERENCES `features` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
