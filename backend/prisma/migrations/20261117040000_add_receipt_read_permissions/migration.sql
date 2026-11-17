INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
VALUES
  ('warehouse-receipt-items.read-all', 'Xem tất cả dòng kiểm hàng nhập kho', NOW(3), NOW(3)),
  ('warehouse-receipt-items.read-own', 'Chỉ xem dòng kiểm hàng nhập kho do chính mình nhập', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `updated_at` = VALUES(`updated_at`);
