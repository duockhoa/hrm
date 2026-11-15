-- Rename in place to preserve every EBR session, ID and timestamp.
RENAME TABLE `user_ebr_sessions` TO `user_app_sessions`;

ALTER TABLE `user_app_sessions`
    ADD COLUMN `application_key` VARCHAR(30) NOT NULL DEFAULT 'hsl',
    DROP INDEX `user_ebr_sessions_active_key_key`,
    ADD UNIQUE INDEX `user_app_sessions_active_key_key` (`active_key`),
    DROP INDEX `user_ebr_sessions_stale_idx`,
    ADD INDEX `user_app_sessions_stale_idx` (`ended_at`, `disconnected_at`, `last_seen_at`),
    DROP FOREIGN KEY `user_ebr_sessions_user_id_fkey`,
    ADD CONSTRAINT `user_app_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    DROP INDEX `user_ebr_sessions_user_connected_idx`,
    DROP INDEX `user_ebr_sessions_connected_idx`,
    ADD INDEX `user_app_sessions_user_id_idx` (`user_id`),
    ADD INDEX `user_app_sessions_app_user_connected_idx` (`application_key`, `user_id`, `connected_at`),
    ADD INDEX `user_app_sessions_app_connected_idx` (`application_key`, `connected_at`, `id`);

-- Existing active EBR tabs can reconnect to the same historical row.
UPDATE `user_app_sessions`
SET `active_key` = CONCAT('hsl:', `active_key`)
WHERE `active_key` IS NOT NULL;

-- New sessions must always specify their application explicitly.
ALTER TABLE `user_app_sessions` ALTER COLUMN `application_key` DROP DEFAULT;
