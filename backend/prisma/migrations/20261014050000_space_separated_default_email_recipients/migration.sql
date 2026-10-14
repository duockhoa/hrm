UPDATE `email_default_recipients`
SET `email` = TRIM(REPLACE(`email`, ',', ' ')), `updated_at` = CURRENT_TIMESTAMP(3)
WHERE `email` LIKE '%,%';
