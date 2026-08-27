INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
VALUES
  ('features.list', 'Xem danh sách feature', NOW(3), NOW(3)),
  ('features.read', 'Xem chi tiết feature và cấu hình feature theo item', NOW(3), NOW(3)),
  ('features.create', 'Tạo feature và gán feature cho item', NOW(3), NOW(3)),
  ('features.update', 'Cập nhật feature và liên kết feature của item', NOW(3), NOW(3)),
  ('features.delete', 'Xóa feature và liên kết feature của item', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `updated_at` = VALUES(`updated_at`);
