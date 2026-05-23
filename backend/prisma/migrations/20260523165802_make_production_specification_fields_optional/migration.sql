-- AlterTable
ALTER TABLE `production_specifications` MODIFY `product_line` VARCHAR(191) NULL,
    MODIFY `dosage_form` VARCHAR(191) NULL,
    MODIFY `lower_control_limit` DECIMAL(18, 6) NULL,
    MODIFY `upper_control_limit` DECIMAL(18, 6) NULL,
    MODIFY `lower_allowed_limit` DECIMAL(18, 6) NULL,
    MODIFY `upper_allowed_limit` DECIMAL(18, 6) NULL,
    MODIFY `unit` VARCHAR(191) NULL;
