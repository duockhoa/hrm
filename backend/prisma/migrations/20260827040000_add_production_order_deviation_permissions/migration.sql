INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
VALUES
  ('production-order-deviations.list', 'Xem danh sách sai lệch lệnh sản xuất', NOW(3), NOW(3)),
  ('production-order-deviations.read', 'Xem chi tiết và ảnh sai lệch lệnh sản xuất', NOW(3), NOW(3)),
  ('production-order-deviations.create', 'Tạo sai lệch lệnh sản xuất', NOW(3), NOW(3)),
  ('production-order-deviations.update', 'Cập nhật sai lệch lệnh sản xuất', NOW(3), NOW(3)),
  ('production-order-deviations.delete', 'Xóa sai lệch lệnh sản xuất', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `updated_at` = VALUES(`updated_at`);
