INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
VALUES
  ('filter-catalogs.list', 'Xem danh sách danh mục lọc', NOW(3), NOW(3)),
  ('filter-catalogs.read', 'Xem chi tiết danh mục lọc', NOW(3), NOW(3)),
  ('filter-catalogs.create', 'Tạo danh mục lọc', NOW(3), NOW(3)),
  ('filter-catalogs.update', 'Cập nhật danh mục lọc', NOW(3), NOW(3)),
  ('filter-catalogs.delete', 'Xóa danh mục lọc', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `updated_at` = VALUES(`updated_at`);
