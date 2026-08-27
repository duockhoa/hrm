INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
VALUES
  ('secondary-packaging-stage-requirements.list', 'Xem danh sách yêu cầu công đoạn đóng gói cấp 2', NOW(3), NOW(3)),
  ('secondary-packaging-stage-requirements.read', 'Xem chi tiết yêu cầu công đoạn đóng gói cấp 2', NOW(3), NOW(3)),
  ('secondary-packaging-stage-requirements.create', 'Tạo yêu cầu công đoạn đóng gói cấp 2', NOW(3), NOW(3)),
  ('secondary-packaging-stage-requirements.update', 'Cập nhật yêu cầu công đoạn đóng gói cấp 2', NOW(3), NOW(3)),
  ('secondary-packaging-stage-requirements.delete', 'Xóa yêu cầu công đoạn đóng gói cấp 2', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `updated_at` = VALUES(`updated_at`);
