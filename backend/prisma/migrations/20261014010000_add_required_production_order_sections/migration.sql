ALTER TABLE `item_features`
    ADD COLUMN `required` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `production_order_document_controls`
    ADD COLUMN `feature_config_snapshot` JSON NULL;

-- Preserve existing issued dossiers with the settings visible at upgrade time.
-- Every requirement starts optional, including snapshots of existing lots.
-- Use GROUP_CONCAT instead of JSON_ARRAYAGG for MariaDB versions before 10.5.
-- Size its session limit from the actual entries so configurations cannot be
-- silently truncated by the server's default group_concat_max_len.
CREATE TEMPORARY TABLE `required_section_config_entries` AS
SELECT settings.`item_code`, feature.`key` AS feature_key,
    COALESCE(settings.`order`, feature.`default_order`) AS feature_order,
    JSON_OBJECT(
        'feature_id', feature.`id`,
        'key', feature.`key`,
        'kind', feature.`kind`,
        'label', feature.`label`,
        'group_name', feature.`group_name`,
        'order', COALESCE(settings.`order`, feature.`default_order`),
        'enabled', JSON_EXTRACT('true', '$'),
        'required', JSON_EXTRACT('false', '$')
    ) AS config_entry
FROM `item_features` AS settings
JOIN `features` AS feature ON feature.`id` = settings.`feature_id`
WHERE settings.`enabled` = true;

SET @required_sections_previous_concat_limit = @@SESSION.group_concat_max_len;
SELECT GREATEST(@@SESSION.group_concat_max_len, COALESCE(MAX(config_size), 2))
INTO @required_sections_concat_limit
FROM (
    SELECT SUM(OCTET_LENGTH(config_entry) + 1) + 2 AS config_size
    FROM `required_section_config_entries`
    GROUP BY `item_code`
) AS sizes;
SET SESSION group_concat_max_len = CAST(@required_sections_concat_limit AS UNSIGNED);

UPDATE `production_order_document_controls` AS dc
JOIN `production_orders` AS po ON po.`id` = dc.`production_order_id`
LEFT JOIN (
    SELECT `item_code`, CONCAT('[', GROUP_CONCAT(
        config_entry ORDER BY feature_order, feature_key SEPARATOR ','
    ), ']') AS config_features
    FROM `required_section_config_entries`
    GROUP BY `item_code`
) AS config ON config.`item_code` = po.`item_code`
SET dc.`feature_config_snapshot` = JSON_OBJECT(
    'version', 1,
    'source', 'legacy',
    'item_code', po.`item_code`,
    'features', JSON_EXTRACT(COALESCE(config.config_features, '[]'), '$')
)
WHERE dc.`batch_record_issued_at` IS NOT NULL
  AND dc.`feature_config_snapshot` IS NULL;

DROP TEMPORARY TABLE `required_section_config_entries`;
SET SESSION group_concat_max_len = @required_sections_previous_concat_limit;
