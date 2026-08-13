-- Preserve existing pH readings by moving them to the first reading column.
ALTER TABLE `production_order_post_preparation_solution_checks`
    RENAME COLUMN `solution_ph` TO `solution_ph_1`;

ALTER TABLE `production_order_post_preparation_solution_checks`
    ADD COLUMN `solution_ph_2` DECIMAL(5, 2) NULL,
    ADD COLUMN `solution_ph_3` DECIMAL(5, 2) NULL;
