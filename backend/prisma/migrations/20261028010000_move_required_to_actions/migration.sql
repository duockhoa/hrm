-- Preserve current item requirements on enabled source actions. Historical
-- production-order snapshots are intentionally left unchanged.
UPDATE `item_features` AS action_setting
JOIN `features` AS action_feature ON action_feature.id = action_setting.feature_id
JOIN `feature_section_actions` AS link ON link.action_id = action_setting.feature_id
JOIN `item_features` AS section_setting
  ON section_setting.feature_id = link.section_id
  AND section_setting.item_code = action_setting.item_code
SET action_setting.required = TRUE
WHERE action_feature.kind = 'action'
  AND action_setting.enabled = TRUE
  AND section_setting.required = TRUE;

UPDATE `item_features` AS setting
JOIN `features` AS feature ON feature.id = setting.feature_id
SET setting.required = FALSE
WHERE feature.kind = 'section';
