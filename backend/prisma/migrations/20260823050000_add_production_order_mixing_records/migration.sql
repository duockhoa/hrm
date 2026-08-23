CREATE TABLE `production_order_mixing_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `mixing_activity_template_id` INTEGER NULL,
    `template_version` VARCHAR(50) NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `po_mixing_records_order_id_key`(`production_order_id`),
    INDEX `po_mixing_records_created_by_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `production_order_mixing_record_stages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_mixing_record_id` INTEGER NOT NULL,
    `source_template_stage_id` INTEGER NULL,
    `stage_name` VARCHAR(255) NOT NULL,
    `stage_order` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `po_mixing_record_stages_order_key`(`production_order_mixing_record_id`, `stage_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `production_order_mixing_record_steps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_mixing_record_stage_id` INTEGER NOT NULL,
    `source_template_step_id` INTEGER NULL,
    `step_name` VARCHAR(255) NOT NULL,
    `step_order` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `po_mixing_record_steps_order_key`(`production_order_mixing_record_stage_id`, `step_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `production_order_mixing_record_parameters` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_mixing_record_step_id` INTEGER NOT NULL,
    `source_template_parameter_id` INTEGER NULL,
    `parameter_name` VARCHAR(255) NOT NULL,
    `data_type` VARCHAR(30) NOT NULL,
    `requirement` TEXT NOT NULL,
    `parameter_order` INTEGER NOT NULL,
    `result_value` TEXT NULL,
    `recorded_by_id` INTEGER NULL,
    `recorded_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `po_mixing_record_parameters_order_key`(`production_order_mixing_record_step_id`, `parameter_order`),
    INDEX `po_mixing_record_parameters_recorder_idx`(`recorded_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `production_order_mixing_records`
    ADD CONSTRAINT `po_mixing_records_order_id_fkey`
    FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `po_mixing_records_created_by_fkey`
    FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `production_order_mixing_record_stages`
    ADD CONSTRAINT `po_mixing_record_stages_record_id_fkey`
    FOREIGN KEY (`production_order_mixing_record_id`) REFERENCES `production_order_mixing_records`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `production_order_mixing_record_steps`
    ADD CONSTRAINT `po_mixing_record_steps_stage_id_fkey`
    FOREIGN KEY (`production_order_mixing_record_stage_id`) REFERENCES `production_order_mixing_record_stages`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `production_order_mixing_record_parameters`
    ADD CONSTRAINT `po_mixing_record_parameters_step_id_fkey`
    FOREIGN KEY (`production_order_mixing_record_step_id`) REFERENCES `production_order_mixing_record_steps`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `po_mixing_record_parameters_recorder_fkey`
    FOREIGN KEY (`recorded_by_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
