UPDATE `production_order_volume_checks`
SET `unit_1_volume` = COALESCE(
    `unit_1_volume`,
    `unit_2_volume`,
    `unit_3_volume`,
    `unit_4_volume`,
    `unit_5_volume`,
    `unit_6_volume`,
    0.01
)
WHERE `unit_1_volume` IS NULL;

ALTER TABLE `production_order_volume_checks`
    MODIFY `package_type` VARCHAR(50) NULL,
    MODIFY `unit_1_volume` DECIMAL(10, 2) NOT NULL;
