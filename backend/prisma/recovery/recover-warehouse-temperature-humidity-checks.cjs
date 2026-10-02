const { readFileSync } = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MIGRATION = '20261002000000_add_warehouse_temperature_humidity_checks';
const TABLE = 'warehouse_temperature_humidity_checks';
const FOREIGN_KEY = `${TABLE}_checked_by_id_fkey`;
const BACKEND_DIR = path.resolve(__dirname, '../..');
const RECOVERY_SQL = readFileSync(
  path.join(
    __dirname,
    '20261002000000_warehouse_temperature_humidity_checks_fk.sql',
  ),
  'utf8',
)
  .replace(/^--.*$/gm, '')
  .trim();

// Verify the first migration only. is_passed belongs to the next migration.
const COLUMN_TYPES = {
  id: 'int',
  location: 'varchar(255)',
  requirement: 'text',
  temperature: 'decimal(5,2)',
  humidity: 'decimal(5,2)',
  checked_by_id: 'int',
  created_at: 'datetime(3)',
  updated_at: 'datetime(3)',
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeType(type) {
  return String(type)
    .toLowerCase()
    .replace(/^int\(\d+\)$/, 'int');
}

async function verifyTable(db) {
  const tables = await db.$queryRawUnsafe(
    `SELECT ENGINE AS engine, TABLE_COLLATION AS collation
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    TABLE,
  );
  assert(
    tables.length === 1,
    `Không tìm thấy bảng ${TABLE}. Cần kiểm tra logs migration trước khi khôi phục.`,
  );
  assert(
    tables[0].engine === 'InnoDB' &&
      tables[0].collation === 'utf8mb4_unicode_ci',
    `Engine/collation của ${TABLE} khác migration; dừng khôi phục.`,
  );

  const columns = await db.$queryRawUnsafe(
    `SELECT COLUMN_NAME AS name, COLUMN_TYPE AS type, IS_NULLABLE AS nullable,
            COLUMN_DEFAULT AS default_value, EXTRA AS extra, COLLATION_NAME AS collation
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    TABLE,
  );
  for (const [name, type] of Object.entries(COLUMN_TYPES)) {
    const column = columns.find((entry) => entry.name === name);
    assert(
      column && normalizeType(column.type) === type && column.nullable === 'NO',
      `Cột ${TABLE}.${name} thiếu hoặc khác migration; dừng khôi phục.`,
    );
    const extra = String(column.extra || '')
      .toLowerCase()
      .replace(/default_generated/g, '')
      .trim();
    assert(
      extra === (name === 'id' ? 'auto_increment' : ''),
      `Thuộc tính cột ${TABLE}.${name} khác migration; dừng khôi phục.`,
    );
    if (name === 'created_at' || name === 'updated_at') {
      assert(
        String(column.default_value).toLowerCase() === 'current_timestamp(3)',
        `Default của ${TABLE}.${name} khác migration; dừng khôi phục.`,
      );
    } else {
      assert(
        column.default_value === null,
        `Default của ${TABLE}.${name} khác migration; dừng khôi phục.`,
      );
    }
    if (name === 'location' || name === 'requirement') {
      assert(
        column.collation === 'utf8mb4_unicode_ci',
        `Collation của ${TABLE}.${name} khác migration; dừng khôi phục.`,
      );
    }
  }

  const indexes = await db.$queryRawUnsafe(`SHOW INDEX FROM \`${TABLE}\``);
  const expectedIndexes = {
    PRIMARY: ['id'],
    [`${TABLE}_checked_by_id_idx`]: ['checked_by_id'],
    [`${TABLE}_location_created_at_idx`]: ['location', 'created_at'],
  };
  for (const [name, expectedColumns] of Object.entries(expectedIndexes)) {
    const entries = indexes
      .filter((entry) => entry.Key_name === name)
      .sort((a, b) => Number(a.Seq_in_index) - Number(b.Seq_in_index));
    assert(
      entries.length === expectedColumns.length &&
        entries.every(
          (entry, index) =>
            entry.Column_name === expectedColumns[index] &&
            entry.Sub_part === null &&
            entry.Index_type === 'BTREE' &&
            entry.Collation === 'A' &&
            Number(entry.Non_unique) === (name === 'PRIMARY' ? 0 : 1),
        ),
      `Index ${name} thiếu hoặc khác migration; dừng khôi phục.`,
    );
  }
}

async function hasCorrectForeignKey(db) {
  const keys = await db.$queryRawUnsafe(
    `SELECT k.CONSTRAINT_NAME AS name, k.COLUMN_NAME AS column_name,
            k.REFERENCED_TABLE_NAME AS referenced_table,
            k.REFERENCED_COLUMN_NAME AS referenced_column,
            (k.REFERENCED_TABLE_SCHEMA = DATABASE()) AS same_database,
            r.DELETE_RULE AS delete_rule, r.UPDATE_RULE AS update_rule
     FROM information_schema.KEY_COLUMN_USAGE k
     JOIN information_schema.REFERENTIAL_CONSTRAINTS r
       ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
      AND r.TABLE_NAME = k.TABLE_NAME AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
     WHERE k.TABLE_SCHEMA = DATABASE() AND k.TABLE_NAME = ?`,
    TABLE,
  );
  const relevant = keys.filter(
    (key) => key.name === FOREIGN_KEY || key.column_name === 'checked_by_id',
  );
  if (relevant.length === 0) return false;
  assert(
    relevant.length === 1 &&
      relevant.every(
        (key) =>
          key.name === FOREIGN_KEY &&
          key.column_name === 'checked_by_id' &&
          key.referenced_table === 'users' &&
          key.referenced_column === 'id' &&
          Number(key.same_database) === 1 &&
          key.delete_rule === 'RESTRICT' &&
          key.update_rule === 'CASCADE',
      ),
    `Khóa ngoại ${FOREIGN_KEY} khác migration; dừng khôi phục.`,
  );
  return true;
}

async function recover({ db, resolveMigration, log = console.log }) {
  const history = await db.$queryRawUnsafe(
    `SELECT migration_name, finished_at, rolled_back_at, logs
     FROM \`_prisma_migrations\`
     WHERE finished_at IS NULL AND rolled_back_at IS NULL`,
  );
  const otherFailures = history.filter(
    (entry) => entry.migration_name !== MIGRATION,
  );
  assert(
    otherFailures.length === 0,
    `Có migration khác chưa hoàn tất: ${otherFailures.map((entry) => entry.migration_name).join(', ')}.`,
  );
  if (history.length === 0) {
    log(
      'Không có migration kho bị lỗi cần khôi phục. Tiếp tục chạy prisma migrate deploy.',
    );
    return;
  }
  assert(
    history.length === 1 && String(history[0].logs || '').trim().length > 0,
    'Migration chưa có logs lỗi hoặc có nhiều bản ghi chưa hoàn tất. Dừng để tránh sửa migration đang chạy.',
  );

  log(`Kiểm tra trạng thái database cho migration ${MIGRATION}...`);
  await verifyTable(db);
  const users = await db.$queryRawUnsafe(
    `SELECT COLUMN_TYPE AS type FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id'`,
  );
  assert(
    users.length === 1 && normalizeType(users[0].type) === 'int',
    'Bảng users hoặc kiểu users.id không phù hợp với migration; dừng khôi phục.',
  );
  const hasForeignKey = await hasCorrectForeignKey(db);
  const orphans = await db.$queryRawUnsafe(
    `SELECT c.id FROM \`${TABLE}\` c
     LEFT JOIN \`users\` u ON u.id = c.checked_by_id
     WHERE u.id IS NULL LIMIT 1`,
  );
  assert(
    orphans.length === 0,
    'Có checked_by_id không tồn tại trong users. Cần sửa dữ liệu trước khi thêm khóa ngoại.',
  );
  if (!hasForeignKey) {
    log(
      'Bổ sung khóa ngoại tham chiếu users(id), giữ nguyên dữ liệu hiện có...',
    );
    await db.$executeRawUnsafe(RECOVERY_SQL);
  } else {
    log('Khóa ngoại đúng đã tồn tại; bỏ qua bước ALTER TABLE.');
  }

  // Recheck after DDL, including retries where ALTER succeeded but resolve failed.
  await verifyTable(db);
  assert(
    await hasCorrectForeignKey(db),
    'Chưa có khóa ngoại đúng; không đánh dấu migration thành công.',
  );
  await resolveMigration();
  const unresolved = await db.$queryRawUnsafe(
    `SELECT migration_name FROM \`_prisma_migrations\`
     WHERE migration_name = ? AND finished_at IS NULL AND rolled_back_at IS NULL`,
    MIGRATION,
  );
  assert(
    unresolved.length === 0,
    'Migration vẫn chưa được resolve; dừng triển khai.',
  );
  log(
    'Đã khôi phục migration kho. Chạy prisma migrate deploy để áp dụng các migration còn lại.',
  );
}

function resolveMigration() {
  const result = spawnSync(
    process.execPath,
    [
      require.resolve('prisma/build/index.js'),
      'migrate',
      'resolve',
      '--applied',
      MIGRATION,
    ],
    { cwd: BACKEND_DIR, stdio: 'inherit' },
  );
  if (result.error) throw result.error;
  assert(
    result.status === 0,
    `prisma migrate resolve thất bại (exit ${result.status}).`,
  );
}

async function main() {
  process.chdir(BACKEND_DIR);
  require('dotenv').config({
    path: path.join(BACKEND_DIR, '.env'),
    quiet: true,
  });
  assert(
    process.env.DATABASE_URL,
    'Thiếu DATABASE_URL trong môi trường hoặc backend/.env.',
  );
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  try {
    await recover({ db, resolveMigration });
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Khôi phục thất bại: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { recover, MIGRATION, TABLE, FOREIGN_KEY };
