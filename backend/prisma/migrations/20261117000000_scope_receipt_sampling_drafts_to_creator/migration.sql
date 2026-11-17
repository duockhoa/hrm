-- Existing drafts have no recorded creator; leave them unassigned instead of
-- granting access to an incorrectly inferred user. New drafts always set this field.
ALTER TABLE `warehouse_receipt_item_sampling_request_drafts`
    ADD COLUMN `created_by_id` INTEGER NULL,
    ADD INDEX `receipt_sampling_drafts_creator_updated_idx` (`created_by_id`, `updated_at`, `id`),
    ADD CONSTRAINT `receipt_sampling_drafts_creator_fkey`
      FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`)
      ON DELETE SET NULL ON UPDATE CASCADE;
