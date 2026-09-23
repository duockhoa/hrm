-- The non-null default also assigns `active` to every existing template.
ALTER TABLE `mixing_activity_templates`
    ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'active' AFTER `description`,
    ADD INDEX `mixing_activity_templates_status_idx`(`status`);
