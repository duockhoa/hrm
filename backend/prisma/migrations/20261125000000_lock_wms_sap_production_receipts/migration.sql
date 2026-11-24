ALTER TABLE `sap_production_receipt_requests`
  ADD COLUMN `active_summary_id` INTEGER NULL;

-- Keep historical requests and prefer an already posted receipt for each summary.
UPDATE `sap_production_receipt_requests` AS `request`
JOIN (
  SELECT `summary_id`,
    COALESCE(
      MAX(CASE WHEN `sap_doc_entry` IS NOT NULL AND `sap_doc_num` IS NOT NULL THEN `id` END),
      MAX(`id`)
    ) AS `active_id`
  FROM `sap_production_receipt_requests`
  GROUP BY `summary_id`
) AS `selected` ON `selected`.`active_id` = `request`.`id`
SET `request`.`active_summary_id` = `request`.`summary_id`;

CREATE UNIQUE INDEX `sap_production_receipt_active_summary_key`
  ON `sap_production_receipt_requests` (`active_summary_id`);
