ALTER TABLE `production_order_mixing_record_parameters`
    ADD COLUMN `note_recorded_by_id` INTEGER NULL,
    ADD COLUMN `note_recorded_at` DATETIME(3) NULL,
    ADD COLUMN `image_uploaded_by_id` INTEGER NULL,
    ADD COLUMN `image_uploaded_at` DATETIME(3) NULL;

ALTER TABLE `production_order_mixing_record_parameters`
    ADD CONSTRAINT `po_mixing_parameter_note_recorder_fkey`
      FOREIGN KEY (`note_recorded_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `po_mixing_parameter_image_uploader_fkey`
      FOREIGN KEY (`image_uploaded_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
