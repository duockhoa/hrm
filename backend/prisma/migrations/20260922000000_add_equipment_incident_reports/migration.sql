CREATE TABLE `equipment_incident_reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `equipment_id` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `priority` VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    `status` VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `equipment_incident_reports_equipment_status_idx`(`equipment_id`, `status`),
    INDEX `equipment_incident_reports_created_by_id_idx`(`created_by_id`),
    INDEX `equipment_incident_reports_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `equipment_incident_reports`
    ADD CONSTRAINT `equipment_incident_reports_equipment_id_fkey`
    FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `equipment_incident_reports`
    ADD CONSTRAINT `equipment_incident_reports_created_by_id_fkey`
    FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
