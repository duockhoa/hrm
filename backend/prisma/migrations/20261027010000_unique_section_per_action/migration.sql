-- Existing duplicates must be resolved explicitly before applying this index.
-- Do not silently choose a section or discard existing links.
CREATE UNIQUE INDEX `feature_section_actions_action_id_key`
ON `feature_section_actions` (`action_id`);

DROP INDEX `feature_section_actions_action_id_idx` ON `feature_section_actions`;
