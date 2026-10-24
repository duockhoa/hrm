-- Register the weighing-record button independently of the mixing-record button.
INSERT INTO `features` (
    `key`, `kind`, `label`, `group_name`, `default_order`, `created_at`, `updated_at`
)
SELECT 'view_weighing_record', 'action', 'Phiếu cân', 'Biểu mẫu Pha chế', 0, NOW(3), NOW(3)
WHERE NOT EXISTS (
    SELECT 1 FROM `features` WHERE `key` = 'view_weighing_record'
);
