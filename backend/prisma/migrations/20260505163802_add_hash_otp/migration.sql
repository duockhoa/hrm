/*
  Warnings:

  - You are about to drop the `password_reset_tokens` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `password_reset_tokens` DROP FOREIGN KEY `password_reset_tokens_user_id_fkey`;

-- DropTable
DROP TABLE `password_reset_tokens`;

-- CreateTable
CREATE TABLE `password_reset_otps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `hash_OTP` VARCHAR(512) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `password_reset_otps_hash_OTP_key`(`hash_OTP`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `password_reset_otps` ADD CONSTRAINT `password_reset_otps_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
