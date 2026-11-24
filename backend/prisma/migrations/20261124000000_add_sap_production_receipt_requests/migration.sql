CREATE TABLE `sap_production_receipt_requests` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `request_id` CHAR(36) NOT NULL,
  `summary_id` INTEGER NOT NULL,
  `payload_hash` CHAR(64) NOT NULL,
  `sap_order_entry` INTEGER NOT NULL,
  `sap_doc_entry` INTEGER NULL,
  `sap_doc_num` INTEGER NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `sap_production_receipt_request_key` (`request_id`),
  INDEX `sap_production_receipt_request_summary_fkey` (`summary_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `sap_production_receipt_request_summary_fkey` FOREIGN KEY (`summary_id`)
    REFERENCES `production_order_finished_product_summaries` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
