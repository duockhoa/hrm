INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
VALUES
  ('weighing-records.read', 'Xem phiếu cân, lịch sử cân, ảnh, realtime và MCP', NOW(3), NOW(3)),
  ('weighing-records.create', 'Tạo phiếu cân', NOW(3), NOW(3)),
  ('weighing-records.update', 'Sửa mô tả phiếu cân', NOW(3), NOW(3)),
  ('weighing-records.delete', 'Xóa phiếu cân', NOW(3), NOW(3)),
  ('weighing-records.materials.create', 'Thêm nguyên liệu vào phiếu cân theo giai đoạn hoặc thủ công', NOW(3), NOW(3)),
  ('weighing-records.materials.update', 'Sửa lượng yêu cầu của nguyên liệu trong phiếu cân', NOW(3), NOW(3)),
  ('weighing-records.materials.delete', 'Xóa nguyên liệu khỏi phiếu cân', NOW(3), NOW(3)),
  ('weighing-records.details.create', 'Nhập lần cân, ghi chú và tải ảnh kèm theo', NOW(3), NOW(3)),
  ('weighing-records.details.update', 'Sửa lần cân, ghi chú và thêm hoặc xóa ảnh', NOW(3), NOW(3)),
  ('weighing-records.details.delete', 'Xóa từng lần cân', NOW(3), NOW(3)),
  ('weighing-records.approve-qa', 'Ký duyệt phiếu cân với vai trò ĐBCL', NOW(3), NOW(3)),
  ('weighing-records.approve-ipc', 'Ký duyệt phiếu cân với vai trò IPC', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `updated_at` = VALUES(`updated_at`);
