ALTER TABLE `sap_item_series`
    ADD COLUMN `document_sub_type` VARCHAR(20) NULL,
    ADD COLUMN `initial_number` INTEGER NULL,
    ADD COLUMN `last_number` INTEGER NULL,
    ADD COLUMN `next_number` INTEGER NULL,
    ADD COLUMN `remarks` TEXT NULL,
    ADD COLUMN `group_code` VARCHAR(50) NULL,
    ADD COLUMN `period_indicator` VARCHAR(255) NULL,
    ADD COLUMN `is_digital_series` BOOLEAN NULL,
    ADD COLUMN `digit_number` INTEGER NULL,
    ADD COLUMN `series_type` VARCHAR(50) NULL,
    ADD COLUMN `bpl_id` INTEGER NULL,
    ADD COLUMN `at_document_type` VARCHAR(255) NULL,
    ADD COLUMN `is_electronic_comm_enabled` BOOLEAN NULL,
    ADD COLUMN `cost_account_only` BOOLEAN NULL,
    ADD COLUMN `invoice_type` INTEGER NULL,
    ADD COLUMN `invoice_type_of_negative_invoice` INTEGER NULL;

-- Preserve the existing SAP snapshot before removing raw_data.
UPDATE `sap_item_series` SET
    `document_sub_type` = CASE WHEN JSON_TYPE(JSON_EXTRACT(`raw_data`, '$.DocumentSubType')) = 'NULL' THEN NULL ELSE JSON_UNQUOTE(JSON_EXTRACT(`raw_data`, '$.DocumentSubType')) END,
    `initial_number` = CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(`raw_data`, '$.InitialNumber')), 'null') AS SIGNED),
    `last_number` = CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(`raw_data`, '$.LastNumber')), 'null') AS SIGNED),
    `next_number` = CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(`raw_data`, '$.NextNumber')), 'null') AS SIGNED),
    `remarks` = CASE WHEN JSON_TYPE(JSON_EXTRACT(`raw_data`, '$.Remarks')) = 'NULL' THEN NULL ELSE JSON_UNQUOTE(JSON_EXTRACT(`raw_data`, '$.Remarks')) END,
    `group_code` = CASE WHEN JSON_TYPE(JSON_EXTRACT(`raw_data`, '$.GroupCode')) = 'NULL' THEN NULL ELSE JSON_UNQUOTE(JSON_EXTRACT(`raw_data`, '$.GroupCode')) END,
    `period_indicator` = CASE WHEN JSON_TYPE(JSON_EXTRACT(`raw_data`, '$.PeriodIndicator')) = 'NULL' THEN NULL ELSE JSON_UNQUOTE(JSON_EXTRACT(`raw_data`, '$.PeriodIndicator')) END,
    `is_digital_series` = CASE JSON_UNQUOTE(JSON_EXTRACT(`raw_data`, '$.IsDigitalSeries')) WHEN 'tYES' THEN TRUE WHEN 'tNO' THEN FALSE ELSE NULL END,
    `digit_number` = CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(`raw_data`, '$.DigitNumber')), 'null') AS SIGNED),
    `series_type` = CASE WHEN JSON_TYPE(JSON_EXTRACT(`raw_data`, '$.SeriesType')) = 'NULL' THEN NULL ELSE JSON_UNQUOTE(JSON_EXTRACT(`raw_data`, '$.SeriesType')) END,
    `bpl_id` = CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(`raw_data`, '$.BPLID')), 'null') AS SIGNED),
    `at_document_type` = CASE WHEN JSON_TYPE(JSON_EXTRACT(`raw_data`, '$.ATDocumentType')) = 'NULL' THEN NULL ELSE JSON_UNQUOTE(JSON_EXTRACT(`raw_data`, '$.ATDocumentType')) END,
    `is_electronic_comm_enabled` = CASE JSON_UNQUOTE(JSON_EXTRACT(`raw_data`, '$.IsElectronicCommEnabled')) WHEN 'tYES' THEN TRUE WHEN 'tNO' THEN FALSE ELSE NULL END,
    `cost_account_only` = CASE JSON_UNQUOTE(JSON_EXTRACT(`raw_data`, '$.CostAccountOnly')) WHEN 'tYES' THEN TRUE WHEN 'tNO' THEN FALSE ELSE NULL END,
    `invoice_type` = CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(`raw_data`, '$.InvoiceType')), 'null') AS SIGNED),
    `invoice_type_of_negative_invoice` = CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(`raw_data`, '$.InvoiceTypeOfNegativeInvoice')), 'null') AS SIGNED);

ALTER TABLE `sap_item_series` DROP COLUMN `raw_data`;
