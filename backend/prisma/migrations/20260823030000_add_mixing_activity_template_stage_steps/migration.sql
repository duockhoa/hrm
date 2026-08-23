CREATE TABLE `mixing_activity_template_stage_steps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mixing_activity_template_stage_id` INTEGER NOT NULL,
    `step_name` VARCHAR(255) NOT NULL,
    `step_order` INTEGER NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `mixing_activity_template_stage_steps_stage_order_key`(`mixing_activity_template_stage_id`, `step_order`),
    INDEX `mixing_activity_template_stage_steps_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `mixing_activity_template_stage_steps`
    ADD CONSTRAINT `mixing_activity_template_stage_steps_stage_id_fkey`
    FOREIGN KEY (`mixing_activity_template_stage_id`) REFERENCES `mixing_activity_template_stages`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `mixing_activity_template_stage_steps`
    ADD CONSTRAINT `mixing_activity_template_stage_steps_created_by_id_fkey`
    FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
