-- AddIndex
ALTER TABLE `production_order_finished_product_summaries` ADD INDEX `po_finished_summary_po_id_fkey`(`production_order_id`);

-- DropIndex
DROP INDEX `po_finished_summary_po_id_key` ON `production_order_finished_product_summaries`;
