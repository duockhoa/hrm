CREATE TABLE `production_order_weighing_record_detail_images` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `production_order_weighing_record_detail_id` INTEGER NOT NULL,
  `image_path` TEXT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `po_weighing_detail_images_detail_idx` (`production_order_weighing_record_detail_id`, `id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `po_weighing_detail_images_detail_fkey` FOREIGN KEY (`production_order_weighing_record_detail_id`) REFERENCES `production_order_weighing_record_details` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `production_order_weighing_record_detail_images`
  (`production_order_weighing_record_detail_id`, `image_path`, `created_at`)
SELECT `id`, `image_path`, `created_at`
FROM `production_order_weighing_record_details`
WHERE `image_path` IS NOT NULL AND `image_path` <> '';
