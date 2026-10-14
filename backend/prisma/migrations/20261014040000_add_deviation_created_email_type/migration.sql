INSERT INTO `email_types` (`code`, `name`)
VALUES ('production_order_deviation_created', 'Phiếu sai lệch')
ON DUPLICATE KEY UPDATE `code` = VALUES(`code`);
