INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
VALUES
  ('production-workshops.list', 'Xem danh sách xưởng sản xuất', NOW(3), NOW(3)),
  ('production-workshops.read', 'Xem xưởng, chênh áp và checklist vệ sinh', NOW(3), NOW(3)),
  ('production-workshops.create', 'Tạo xưởng, chênh áp và checklist vệ sinh', NOW(3), NOW(3)),
  ('production-workshops.update', 'Cập nhật xưởng, chênh áp và checklist vệ sinh', NOW(3), NOW(3)),
  ('production-workshops.delete', 'Xóa xưởng, chênh áp và checklist vệ sinh', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `updated_at` = VALUES(`updated_at`);
