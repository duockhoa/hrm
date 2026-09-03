INSERT INTO `applications` (
  `key`,
  `name`,
  `description`,
  `default_order`,
  `is_active`,
  `created_at`,
  `updated_at`
)
VALUES (
  'equipment',
  'Quản lý thiết bị',
  'Ứng dụng quản lý thiết bị và theo dõi vận hành.',
  50,
  TRUE,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `is_active` = TRUE,
  `updated_at` = CURRENT_TIMESTAMP(3);
