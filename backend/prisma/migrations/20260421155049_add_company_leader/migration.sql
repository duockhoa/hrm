/*
  Warnings:

  - A unique constraint covering the columns `[leader_id]` on the table `company` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `company` ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `leader_id` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `company_leader_id_key` ON `company`(`leader_id`);

-- AddForeignKey
ALTER TABLE `company` ADD CONSTRAINT `company_leader_id_fkey` FOREIGN KEY (`leader_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
