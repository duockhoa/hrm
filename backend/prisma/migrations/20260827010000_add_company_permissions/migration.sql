INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
VALUES
  ('companies.list', 'Xem danh sách công ty', NOW(3), NOW(3)),
  ('companies.read', 'Xem chi tiết công ty', NOW(3), NOW(3)),
  ('companies.create', 'Tạo công ty', NOW(3), NOW(3)),
  ('companies.update', 'Cập nhật công ty', NOW(3), NOW(3)),
  ('companies.delete', 'Xóa công ty', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `updated_at` = VALUES(`updated_at`);
