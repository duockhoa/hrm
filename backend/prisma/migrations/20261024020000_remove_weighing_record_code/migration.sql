ALTER TABLE `production_order_weighing_records`
    DROP INDEX `po_weighing_records_code_key`,
    DROP COLUMN `record_code`;
