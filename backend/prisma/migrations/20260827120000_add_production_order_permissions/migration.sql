INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
VALUES
  ('production-orders.list', 'Xem danh sách lệnh sản xuất', NOW(3), NOW(3)),
  ('production-orders.read', 'Xem chi tiết, dữ liệu con và file của lệnh sản xuất', NOW(3), NOW(3)),
  ('production-orders.create', 'Tạo dữ liệu thuộc lệnh sản xuất', NOW(3), NOW(3)),
  ('production-orders.update', 'Cập nhật và phê duyệt dữ liệu lệnh sản xuất', NOW(3), NOW(3)),
  ('production-orders.delete', 'Xóa dữ liệu thuộc lệnh sản xuất', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `updated_at` = VALUES(`updated_at`);
