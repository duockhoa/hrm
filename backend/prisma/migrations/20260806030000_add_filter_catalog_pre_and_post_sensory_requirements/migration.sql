-- AlterTable
ALTER TABLE `filter_catalogs`
    CHANGE COLUMN `sensory_requirement` `pre_filter_sensory_requirement` TEXT NULL,
    ADD COLUMN `post_filter_sensory_requirement` TEXT NULL;
