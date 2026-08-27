INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
VALUES
  ('applications.list', 'Xem danh sách ứng dụng', NOW(3), NOW(3)),
  ('applications.read', 'Xem chi tiết ứng dụng', NOW(3), NOW(3)),
  ('applications.create', 'Tạo ứng dụng', NOW(3), NOW(3)),
  ('applications.update', 'Cập nhật ứng dụng', NOW(3), NOW(3)),
  ('applications.delete', 'Xóa ứng dụng', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `updated_at` = VALUES(`updated_at`);
