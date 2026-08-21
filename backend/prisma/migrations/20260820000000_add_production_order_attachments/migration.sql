CREATE TABLE `production_order_attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `attachment_type` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `entered_by_id` INTEGER NOT NULL,
    `entered_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `requires_approval` BOOLEAN NOT NULL DEFAULT false,
    `approval_status` VARCHAR(20) NULL,
    `approved_by_id` INTEGER NULL,
    `approved_at` DATETIME(3) NULL,
    `approval_note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_attachments_po_id_idx`(`production_order_id`),
    INDEX `po_attachments_approval_status_idx`(`approval_status`),
    INDEX `po_attachments_entered_by_id_idx`(`entered_by_id`),
    INDEX `po_attachments_approved_by_id_idx`(`approved_by_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `po_attachments_po_id_fkey`
      FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `po_attachments_entered_by_id_fkey`
      FOREIGN KEY (`entered_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `po_attachments_approved_by_id_fkey`
      FOREIGN KEY (`approved_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `production_order_attachment_files` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `attachment_id` INTEGER NOT NULL,
    `file_path` TEXT NOT NULL,
    `original_filename` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `file_size` INTEGER NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_attachment_files_attachment_id_idx`(`attachment_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `po_attachment_files_attachment_id_fkey`
      FOREIGN KEY (`attachment_id`) REFERENCES `production_order_attachments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
