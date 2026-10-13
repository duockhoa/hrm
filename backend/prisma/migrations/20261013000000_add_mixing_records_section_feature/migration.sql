-- Register a section key independent of the mixing-record action.
INSERT INTO `features` (
    `key`, `kind`, `label`, `group_name`, `default_order`, `created_at`, `updated_at`
)
SELECT 'mixing_records', 'section', 'Phiếu pha chế', 'Biểu mẫu Pha chế', 0, NOW(3), NOW(3)
WHERE NOT EXISTS (
    SELECT 1 FROM `features` WHERE `key` = 'mixing_records'
);

-- Initialize existing items from their action setting; subsequent settings are independent.
INSERT INTO `item_features` (
    `item_code`, `feature_id`, `enabled`, `order`, `created_at`, `updated_at`
)
SELECT
    action_setting.`item_code`,
    section_feature.`id`,
    action_setting.`enabled`,
    COALESCE(action_setting.`order`, action_feature.`default_order`),
    NOW(3),
    NOW(3)
FROM `item_features` AS action_setting
JOIN `features` AS action_feature
    ON action_feature.`id` = action_setting.`feature_id`
    AND action_feature.`key` = 'view_mixing_record'
    AND action_feature.`kind` = 'action'
JOIN `features` AS section_feature
    ON section_feature.`key` = 'mixing_records'
    AND section_feature.`kind` = 'section'
LEFT JOIN `item_features` AS section_setting
    ON section_setting.`item_code` = action_setting.`item_code`
    AND section_setting.`feature_id` = section_feature.`id`
WHERE section_setting.`id` IS NULL;
