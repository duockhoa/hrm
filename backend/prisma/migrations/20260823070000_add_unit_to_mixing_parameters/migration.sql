ALTER TABLE `mixing_activity_template_stage_step_parameters`
    ADD COLUMN `unit` VARCHAR(50) NULL AFTER `data_type`;

ALTER TABLE `production_order_mixing_record_parameters`
    ADD COLUMN `unit` VARCHAR(50) NULL AFTER `data_type`;
