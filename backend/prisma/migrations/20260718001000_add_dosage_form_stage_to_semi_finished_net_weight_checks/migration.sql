-- AlterTable
ALTER TABLE `production_order_semi_finished_product_net_weight_checks`
    ADD COLUMN `dosage_form_stage` VARCHAR(50) NULL AFTER `requirement`;
