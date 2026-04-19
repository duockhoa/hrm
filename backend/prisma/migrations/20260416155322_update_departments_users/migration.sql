/*
  Warnings:

  - You are about to drop the `_Departments_users` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `_Departments_users` DROP FOREIGN KEY `_Departments_users_A_fkey`;

-- DropForeignKey
ALTER TABLE `_Departments_users` DROP FOREIGN KEY `_Departments_users_B_fkey`;

-- DropTable
DROP TABLE `_Departments_users`;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_department_fkey` FOREIGN KEY (`department`) REFERENCES `departments`(`name`) ON DELETE SET NULL ON UPDATE CASCADE;
