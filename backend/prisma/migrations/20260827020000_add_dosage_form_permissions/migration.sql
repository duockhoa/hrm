INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
VALUES
  ('dosage-forms.list', 'Xem danh sách dạng bào chế', NOW(3), NOW(3)),
  ('dosage-forms.read', 'Xem chi tiết dạng bào chế', NOW(3), NOW(3)),
  ('dosage-forms.create', 'Tạo dạng bào chế', NOW(3), NOW(3)),
  ('dosage-forms.update', 'Cập nhật dạng bào chế', NOW(3), NOW(3)),
  ('dosage-forms.delete', 'Xóa dạng bào chế', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `updated_at` = VALUES(`updated_at`);
