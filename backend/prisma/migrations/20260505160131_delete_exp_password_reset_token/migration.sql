/*
  Warnings:

  - You are about to drop the column `expires_at` on the `password_reset_tokens` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `password_reset_tokens` DROP COLUMN `expires_at`;
