CREATE TABLE `mixing_activity_template_stage_step_parameters` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mixing_activity_template_stage_step_id` INTEGER NOT NULL,
    `parameter_name` VARCHAR(255) NOT NULL,
    `data_type` VARCHAR(30) NOT NULL,
    `requirement` TEXT NOT NULL,
    `parameter_order` INTEGER NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `mixing_activity_template_stage_step_parameters_step_order_key`(`mixing_activity_template_stage_step_id`, `parameter_order`),
    INDEX `mixing_activity_template_stage_step_parameters_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `mixing_activity_template_stage_step_parameters`
    ADD CONSTRAINT `mixing_activity_template_stage_step_parameters_step_id_fkey`
    FOREIGN KEY (`mixing_activity_template_stage_step_id`) REFERENCES `mixing_activity_template_stage_steps`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `mixing_activity_template_stage_step_parameters`
    ADD CONSTRAINT `mat_stage_step_parameters_created_by_fkey`
    FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
