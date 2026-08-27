INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
VALUES
  ('departments.list', 'Xem danh sách phòng ban', NOW(3), NOW(3)),
  ('departments.read', 'Xem chi tiết phòng ban', NOW(3), NOW(3)),
  ('departments.create', 'Tạo phòng ban', NOW(3), NOW(3)),
  ('departments.update', 'Cập nhật phòng ban', NOW(3), NOW(3)),
  ('departments.delete', 'Xóa phòng ban', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `updated_at` = VALUES(`updated_at`);
