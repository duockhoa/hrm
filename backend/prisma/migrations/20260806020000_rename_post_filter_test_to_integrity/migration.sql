-- AlterTable
ALTER TABLE `production_order_filtration_checks`
    CHANGE COLUMN `post_filter_test_requirement` `post_filter_integrity_requirement` TEXT NULL,
    CHANGE COLUMN `post_filter_test_result` `post_filter_integrity_result` TEXT NULL;
