-- DropForeignKey
ALTER TABLE `users` DROP FOREIGN KEY `users_department_fkey`;

-- DropIndex
DROP INDEX `users_department_fkey` ON `users`;

-- CreateTable
CREATE TABLE `_Departments_users` (
    `A` VARCHAR(191) NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_Departments_users_AB_unique`(`A`, `B`),
    INDEX `_Departments_users_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_Departments_users` ADD CONSTRAINT `_Departments_users_A_fkey` FOREIGN KEY (`A`) REFERENCES `departments`(`name`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_Departments_users` ADD CONSTRAINT `_Departments_users_B_fkey` FOREIGN KEY (`B`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
