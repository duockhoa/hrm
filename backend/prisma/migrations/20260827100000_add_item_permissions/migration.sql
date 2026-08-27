INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
VALUES
  ('items.list', 'Xem danh sách item', NOW(3), NOW(3)),
  ('items.read', 'Xem chi tiết item, thiết bị và biểu mẫu hoạt động pha', NOW(3), NOW(3)),
  ('items.create', 'Tạo thiết bị theo item và biểu mẫu hoạt động pha', NOW(3), NOW(3)),
  ('items.update', 'Cập nhật item và biểu mẫu hoạt động pha', NOW(3), NOW(3)),
  ('items.delete', 'Xóa thiết bị theo item và biểu mẫu hoạt động pha', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `updated_at` = VALUES(`updated_at`);
