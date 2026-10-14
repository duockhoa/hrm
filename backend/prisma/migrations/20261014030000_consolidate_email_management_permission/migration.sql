START TRANSACTION;

INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
VALUES ('email-settings.manage', 'Quản lý email', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`), `updated_at` = VALUES(`updated_at`);

-- Preserve access for roles that already had either email settings permission.
INSERT INTO `role_permissions` (`role_id`, `permission_id`, `created_at`, `updated_at`)
SELECT DISTINCT old_assignment.`role_id`, management_permission.`id`, NOW(3), NOW(3)
FROM `role_permissions` AS old_assignment
JOIN `permissions` AS old_permission ON old_permission.`id` = old_assignment.`permission_id`
JOIN `permissions` AS management_permission ON management_permission.`name` = 'email-settings.manage'
LEFT JOIN `role_permissions` AS existing_assignment
    ON existing_assignment.`role_id` = old_assignment.`role_id`
    AND existing_assignment.`permission_id` = management_permission.`id`
WHERE old_permission.`name` IN ('email-settings.read', 'email-settings.update')
AND existing_assignment.`id` IS NULL;

-- Foreign keys cascade the obsolete role assignments after access is transferred.
DELETE FROM `permissions` WHERE `name` IN ('email-settings.read', 'email-settings.update');

COMMIT;
