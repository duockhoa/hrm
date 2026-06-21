-- DropForeignKey
ALTER TABLE `production_order_capsule_shell_weight_checks`
    DROP FOREIGN KEY `po_capsule_shell_weight_checks_po_id_fkey`,
    DROP FOREIGN KEY `po_capsule_shell_weight_checks_created_by_id_fkey`;

-- RenameTable
RENAME TABLE `production_order_capsule_shell_weight_checks` TO `production_order_shell_weight_checks`;

-- RenameIndex
ALTER TABLE `production_order_shell_weight_checks`
    RENAME INDEX `po_capsule_shell_weight_checks_po_id_fkey` TO `po_shell_weight_checks_po_id_fkey`,
    RENAME INDEX `po_capsule_shell_weight_checks_created_by_id_fkey` TO `po_shell_weight_checks_created_by_id_fkey`;

-- AddForeignKey
ALTER TABLE `production_order_shell_weight_checks`
    ADD CONSTRAINT `po_shell_weight_checks_po_id_fkey`
        FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `po_shell_weight_checks_created_by_id_fkey`
        FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE;
