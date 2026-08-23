INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
VALUES (
  'production-orders.mixing-records.delete',
  'Xóa phiếu pha chế gắn với lệnh sản xuất',
  NOW(3),
  NOW(3)
)
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `updated_at` = VALUES(`updated_at`);
