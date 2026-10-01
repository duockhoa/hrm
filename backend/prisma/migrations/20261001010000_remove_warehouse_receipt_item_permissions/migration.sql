-- Role permission links are removed by the existing ON DELETE CASCADE constraint.
DELETE FROM `permissions`
WHERE `name` IN (
    'warehouse-receipt-items.list',
    'warehouse-receipt-items.read',
    'warehouse-receipt-items.create',
    'warehouse-receipt-items.update',
    'warehouse-receipt-items.delete'
);
