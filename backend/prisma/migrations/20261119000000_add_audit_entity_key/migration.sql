ALTER TABLE `audit_logs`
  ADD COLUMN `entity_key` VARCHAR(191) NULL;

CREATE INDEX `idx_audit_logs_entity_key`
  ON `audit_logs` (`entity_type`, `entity_key`, `created_at` DESC);
