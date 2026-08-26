ALTER TABLE `production_order_post_secondary_pending_process_items`
  MODIFY `processing_plan` TEXT NULL;

ALTER TABLE `production_order_post_secondary_pending_cancellation_items`
  MODIFY `cancellation_plan` TEXT NULL;
