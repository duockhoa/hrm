INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
VALUES
  ('cleaning-objects.list', 'Xem danh sách đối tượng vệ sinh', NOW(3), NOW(3)),
  ('cleaning-objects.read', 'Xem chi tiết đối tượng vệ sinh', NOW(3), NOW(3)),
  ('cleaning-objects.create', 'Tạo đối tượng vệ sinh', NOW(3), NOW(3)),
  ('cleaning-objects.update', 'Cập nhật đối tượng vệ sinh', NOW(3), NOW(3)),
  ('cleaning-objects.delete', 'Xóa đối tượng vệ sinh', NOW(3), NOW(3)),
  ('cleaning-requirements.list', 'Xem danh sách yêu cầu vệ sinh', NOW(3), NOW(3)),
  ('cleaning-requirements.read', 'Xem chi tiết yêu cầu vệ sinh', NOW(3), NOW(3)),
  ('cleaning-requirements.create', 'Tạo yêu cầu vệ sinh', NOW(3), NOW(3)),
  ('cleaning-requirements.update', 'Cập nhật yêu cầu vệ sinh', NOW(3), NOW(3)),
  ('cleaning-requirements.delete', 'Xóa yêu cầu vệ sinh', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `updated_at` = VALUES(`updated_at`);
