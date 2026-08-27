INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
VALUES
  ('production-specifications.list', 'Xem danh sách tiêu chuẩn sản xuất', NOW(3), NOW(3)),
  ('production-specifications.read', 'Xem chi tiết tiêu chuẩn sản xuất', NOW(3), NOW(3)),
  ('production-specifications.create', 'Tạo tiêu chuẩn sản xuất', NOW(3), NOW(3)),
  ('production-specifications.update', 'Cập nhật tiêu chuẩn sản xuất', NOW(3), NOW(3)),
  ('production-specifications.delete', 'Xóa tiêu chuẩn sản xuất', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `updated_at` = VALUES(`updated_at`);
