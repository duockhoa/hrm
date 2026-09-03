-- CreateIndex
CREATE INDEX `po_post_secondary_summary_semi_finished_order_id_idx` ON `production_order_post_secondary_packaging_summaries`(`semi_finished_product_order_id`);

-- DropIndex
DROP INDEX `po_post_secondary_summary_semi_finished_order_id_key` ON `production_order_post_secondary_packaging_summaries`;
