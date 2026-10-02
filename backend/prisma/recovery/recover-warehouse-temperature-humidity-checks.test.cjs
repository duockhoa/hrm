const assert = require('node:assert/strict');
const test = require('node:test');
const {
  recover,
  MIGRATION,
  TABLE,
  FOREIGN_KEY,
} = require('./recover-warehouse-temperature-humidity-checks.cjs');

function correctForeignKey() {
  return {
    name: FOREIGN_KEY,
    column_name: 'checked_by_id',
    referenced_table: 'users',
    referenced_column: 'id',
    same_database: 1,
    delete_rule: 'RESTRICT',
    update_rule: 'CASCADE',
  };
}

function fixture() {
  const state = {
    history: [
      {
        migration_name: MIGRATION,
        finished_at: null,
        rolled_back_at: null,
        logs: 'Migration failed: MySQL 1824 at statement 2',
      },
    ],
    tables: [{ engine: 'InnoDB', collation: 'utf8mb4_unicode_ci' }],
    columns: [
      { name: 'id', type: 'int', extra: 'auto_increment' },
      {
        name: 'location',
        type: 'varchar(255)',
        collation: 'utf8mb4_unicode_ci',
      },
      { name: 'requirement', type: 'text', collation: 'utf8mb4_unicode_ci' },
      { name: 'temperature', type: 'decimal(5,2)' },
      { name: 'humidity', type: 'decimal(5,2)' },
      { name: 'checked_by_id', type: 'int' },
      {
        name: 'created_at',
        type: 'datetime(3)',
        default_value: 'CURRENT_TIMESTAMP(3)',
        extra: 'DEFAULT_GENERATED',
      },
      {
        name: 'updated_at',
        type: 'datetime(3)',
        default_value: 'CURRENT_TIMESTAMP(3)',
        extra: 'DEFAULT_GENERATED',
      },
    ].map((column) => ({
      nullable: 'NO',
      default_value: null,
      extra: '',
      collation: null,
      ...column,
    })),
    indexes: [
      {
        Key_name: 'PRIMARY',
        Seq_in_index: 1,
        Column_name: 'id',
        Non_unique: 0,
        Sub_part: null,
      },
      {
        Key_name: `${TABLE}_checked_by_id_idx`,
        Seq_in_index: 1,
        Column_name: 'checked_by_id',
        Non_unique: 1,
        Sub_part: null,
      },
      {
        Key_name: `${TABLE}_location_created_at_idx`,
        Seq_in_index: 1,
        Column_name: 'location',
        Non_unique: 1,
        Sub_part: null,
      },
      {
        Key_name: `${TABLE}_location_created_at_idx`,
        Seq_in_index: 2,
        Column_name: 'created_at',
        Non_unique: 1,
        Sub_part: null,
      },
    ].map((index) => ({ Index_type: 'BTREE', Collation: 'A', ...index })),
    users: [{ type: 'int' }],
    foreignKeys: [],
    // These rows survive repair. An orphan is a check without a matching user.
    userRows: [{ id: 12 }],
    checkRows: [{ id: 31, checked_by_id: 12, location: 'Kho thành phẩm' }],
    events: [],
    statements: [],
    resolveCalls: 0,
    afterDdl: null,
    resolveError: null,
    resolveClearsHistory: true,
  };
  const snapshot = (rows) => rows.map((row) => ({ ...row }));
  const db = {
    async $queryRawUnsafe(sql, ...parameters) {
      const query = sql.replace(/\s+/g, ' ').trim();
      if (query.includes('`_prisma_migrations`')) {
        state.events.push('history');
        return snapshot(
          state.history.filter(
            (row) =>
              row.finished_at === null &&
              row.rolled_back_at === null &&
              (parameters.length === 0 || row.migration_name === parameters[0]),
          ),
        );
      }
      if (query.includes('information_schema.TABLES')) {
        assert.deepEqual(parameters, [TABLE]);
        state.events.push('table');
        return snapshot(state.tables);
      }
      if (query.includes('information_schema.COLUMNS')) {
        if (query.includes("TABLE_NAME = 'users'")) {
          state.events.push('users');
          return snapshot(state.users);
        }
        assert.deepEqual(parameters, [TABLE]);
        state.events.push('columns');
        return snapshot(state.columns);
      }
      if (query.startsWith('SHOW INDEX')) {
        assert.ok(query.includes('`' + TABLE + '`'));
        state.events.push('indexes');
        return snapshot(state.indexes);
      }
      if (query.includes('information_schema.KEY_COLUMN_USAGE')) {
        assert.deepEqual(parameters, [TABLE]);
        state.events.push('foreign_keys');
        return snapshot(state.foreignKeys);
      }
      if (query.includes('LEFT JOIN `users`')) {
        state.events.push('orphans');
        return state.checkRows
          .filter(
            (row) =>
              !state.userRows.some((user) => user.id === row.checked_by_id),
          )
          .slice(0, 1)
          .map(({ id }) => ({ id }));
      }
      throw new Error(`Unexpected query in recovery test: ${query}`);
    },
    async $executeRawUnsafe(sql) {
      state.events.push('ddl');
      state.statements.push(sql);
      assert.match(
        sql,
        /^ALTER TABLE\s+`warehouse_temperature_humidity_checks`\s+ADD CONSTRAINT/,
      );
      assert.ok(sql.includes('`' + FOREIGN_KEY + '`'));
      assert.match(
        sql,
        /REFERENCES\s+`users`\s*\(`id`\)\s+ON DELETE RESTRICT ON UPDATE CASCADE;/,
      );
      assert.doesNotMatch(sql, /(?:^|;)\s*(?:DROP|DELETE|TRUNCATE)\b/im);
      if (state.afterDdl) await state.afterDdl();
      else state.foreignKeys.push(correctForeignKey());
      return 0;
    },
  };
  async function resolveMigration() {
    state.events.push('resolve');
    state.resolveCalls++;
    assert.deepEqual(
      state.foreignKeys,
      [correctForeignKey()],
      'Only a database with the complete FK may be resolved',
    );
    if (state.resolveError) throw state.resolveError;
    if (state.resolveClearsHistory) {
      state.history
        .filter(
          (row) =>
            row.migration_name === MIGRATION && row.rolled_back_at === null,
        )
        .forEach((row) => {
          row.finished_at = new Date('2026-10-02T15:30:00.000Z');
        });
    }
  }
  return { state, run: () => recover({ db, resolveMigration, log: () => {} }) };
}

function assertNoWrites(state) {
  assert.deepEqual(state.statements, []);
  assert.equal(state.resolveCalls, 0);
}

test('completes a partially applied migration before resolve and preserves existing rows', async () => {
  const { state, run } = fixture();
  const rowsBefore = structuredClone(state.checkRows);
  await run();
  assert.equal(state.statements.length, 1);
  assert.deepEqual(state.foreignKeys, [correctForeignKey()]);
  assert.equal(state.resolveCalls, 1);
  assert.ok(state.events.indexOf('ddl') < state.events.indexOf('resolve'));
  assert.ok(
    state.events.lastIndexOf('foreign_keys') > state.events.indexOf('ddl'),
  );
  assert.equal(state.events.at(-1), 'history');
  assert.ok(state.history[0].finished_at instanceof Date);
  assert.deepEqual(state.checkRows, rowsBefore);
});

test('resolves an already complete schema without applying SQL again', async () => {
  const { state, run } = fixture();
  state.foreignKeys.push(correctForeignKey());
  // MySQL 5.7 can expose int display widths; they do not change the column type.
  state.columns
    .filter((column) => column.type === 'int')
    .forEach((column) => {
      column.type = 'int(11)';
    });
  state.users[0].type = 'int(11)';
  await run();
  assert.deepEqual(state.statements, []);
  assert.equal(state.resolveCalls, 1);
  assert.ok(state.history[0].finished_at instanceof Date);
});

test('retries resolve safely when a prior attempt already added the foreign key', async () => {
  const { state, run } = fixture();
  state.resolveError = new Error('prisma CLI failed');
  await assert.rejects(run, /prisma CLI failed/);
  assert.equal(state.statements.length, 1);
  assert.equal(state.history[0].finished_at, null);
  state.resolveError = null;
  await run();
  assert.equal(
    state.statements.length,
    1,
    'The retry must not add the same foreign key twice',
  );
  assert.equal(state.resolveCalls, 2);
  assert.ok(state.history[0].finished_at instanceof Date);
});

test('does nothing when no active failed migration exists', async () => {
  const { state, run } = fixture();
  state.history = [
    {
      migration_name: MIGRATION,
      finished_at: new Date(),
      rolled_back_at: null,
    },
    {
      migration_name: MIGRATION,
      finished_at: null,
      rolled_back_at: new Date(),
    },
  ];
  // An unrelated bad schema must not be inspected when there is no recovery to do.
  state.tables = [];
  await run();
  assert.deepEqual(state.events, ['history']);
  assertNoWrites(state);
});

test('refuses an unrelated failed migration before inspecting or changing the warehouse table', async () => {
  const { state, run } = fixture();
  state.history.push({
    migration_name: 'another_failed_migration',
    finished_at: null,
    rolled_back_at: null,
  });
  await assert.rejects(run, /another_failed_migration/);
  assert.deepEqual(state.events, ['history']);
  assertNoWrites(state);
});

test('refuses an unfinished migration without failure logs or with ambiguous active attempts', async (t) => {
  for (const logs of [null, '', '   ']) {
    await t.test(`failure logs ${JSON.stringify(logs)}`, async () => {
      const { state, run } = fixture();
      state.history[0].logs = logs;
      await assert.rejects(run);
      assert.deepEqual(state.events, ['history']);
      assertNoWrites(state);
    });
  }
  await t.test('two unfinished target attempts', async () => {
    const { state, run } = fixture();
    state.history.push({ ...state.history[0] });
    await assert.rejects(run);
    assert.deepEqual(state.events, ['history']);
    assertNoWrites(state);
  });
});

test('refuses missing or incompatible table definitions', async (t) => {
  const cases = [
    [
      'missing table',
      (state) => {
        state.tables = [];
      },
    ],
    [
      'wrong storage engine',
      (state) => {
        state.tables[0].engine = 'MyISAM';
      },
    ],
    [
      'wrong table collation',
      (state) => {
        state.tables[0].collation = 'utf8mb4_general_ci';
      },
    ],
  ];
  for (const [name, corrupt] of cases) {
    await t.test(name, async () => {
      const { state, run } = fixture();
      corrupt(state);
      await assert.rejects(run);
      assertNoWrites(state);
    });
  }
});

test('refuses incompatible columns and defaults', async (t) => {
  const cases = [
    [
      'missing temperature',
      'temperature',
      (column, state) => {
        state.columns = state.columns.filter((entry) => entry !== column);
      },
    ],
    [
      'wrong decimal precision',
      'temperature',
      (column) => {
        column.type = 'decimal(6,2)';
      },
    ],
    [
      'unsigned checked_by_id',
      'checked_by_id',
      (column) => {
        column.type = 'int unsigned';
      },
    ],
    [
      'nullable checked_by_id',
      'checked_by_id',
      (column) => {
        column.nullable = 'YES';
      },
    ],
    [
      'missing auto increment',
      'id',
      (column) => {
        column.extra = '';
      },
    ],
    [
      'unexpected generated column',
      'location',
      (column) => {
        column.extra = 'VIRTUAL GENERATED';
      },
    ],
    [
      'unexpected numeric default',
      'humidity',
      (column) => {
        column.default_value = '0';
      },
    ],
    [
      'missing timestamp default',
      'created_at',
      (column) => {
        column.default_value = null;
      },
    ],
    [
      'wrong timestamp precision',
      'updated_at',
      (column) => {
        column.default_value = 'CURRENT_TIMESTAMP';
      },
    ],
    [
      'wrong text collation',
      'requirement',
      (column) => {
        column.collation = 'utf8mb4_general_ci';
      },
    ],
  ];
  for (const [name, columnName, corrupt] of cases) {
    await t.test(name, async () => {
      const { state, run } = fixture();
      corrupt(
        state.columns.find((column) => column.name === columnName),
        state,
      );
      await assert.rejects(run);
      assertNoWrites(state);
    });
  }
});

test('refuses missing or incompatible indexes', async (t) => {
  const cases = [
    [
      'missing lookup index',
      (state) => {
        state.indexes = state.indexes.filter(
          (index) => index.Column_name !== 'checked_by_id',
        );
      },
    ],
    [
      'wrong primary key column',
      (state) => {
        state.indexes[0].Column_name = 'checked_by_id';
      },
    ],
    [
      'wrong composite column order',
      (state) => {
        state.indexes[2].Seq_in_index = 2;
        state.indexes[3].Seq_in_index = 1;
      },
    ],
    [
      'truncated prefix index',
      (state) => {
        state.indexes[2].Sub_part = 20;
      },
    ],
    [
      'unexpected uniqueness',
      (state) => {
        state.indexes[1].Non_unique = 0;
      },
    ],
    [
      'descending index',
      (state) => {
        state.indexes[2].Collation = 'D';
      },
    ],
    [
      'wrong index type',
      (state) => {
        state.indexes[1].Index_type = 'HASH';
      },
    ],
  ];
  for (const [name, corrupt] of cases) {
    await t.test(name, async () => {
      const { state, run } = fixture();
      corrupt(state);
      await assert.rejects(run);
      assertNoWrites(state);
    });
  }
});

test('refuses an absent or incompatible referenced users column', async (t) => {
  for (const [name, users] of [
    ['absent users.id', []],
    ['unsigned users.id', [{ type: 'int unsigned' }]],
    ['bigint users.id', [{ type: 'bigint' }]],
  ]) {
    await t.test(name, async () => {
      const { state, run } = fixture();
      state.users = users;
      await assert.rejects(run);
      assertNoWrites(state);
    });
  }
});

test('refuses orphan data without deleting rows or marking the migration applied', async () => {
  const { state, run } = fixture();
  state.checkRows.push({
    id: 32,
    checked_by_id: 999,
    location: 'Kho nguyên liệu',
  });
  const rowsBefore = structuredClone(state.checkRows);
  await assert.rejects(run);
  assertNoWrites(state);
  assert.deepEqual(state.checkRows, rowsBefore);
});

test('refuses an existing foreign key that differs from the intended constraint', async (t) => {
  const cases = [
    ['wrong target table', { referenced_table: 'Users' }],
    ['wrong target column', { referenced_column: 'employee_id' }],
    ['different database', { same_database: 0 }],
    ['destructive delete action', { delete_rule: 'CASCADE' }],
    ['wrong update action', { update_rule: 'RESTRICT' }],
    ['different constraint name', { name: 'another_checked_by_fk' }],
    ['same name on wrong column', { column_name: 'id' }],
  ];
  for (const [name, changes] of cases) {
    await t.test(name, async () => {
      const { state, run } = fixture();
      state.foreignKeys.push({ ...correctForeignKey(), ...changes });
      await assert.rejects(run);
      assertNoWrites(state);
    });
  }
  await t.test('ambiguous duplicate constraint on checked_by_id', async () => {
    const { state, run } = fixture();
    state.foreignKeys.push(correctForeignKey(), {
      ...correctForeignKey(),
      name: 'another_checked_by_fk',
    });
    await assert.rejects(run);
    assertNoWrites(state);
  });
});

test('does not resolve when ALTER TABLE fails', async () => {
  const { state, run } = fixture();
  state.afterDdl = () => {
    throw new Error('MySQL 1215: Cannot add foreign key constraint');
  };
  await assert.rejects(run, /MySQL 1215/);
  assert.equal(state.statements.length, 1);
  assert.equal(state.resolveCalls, 0);
  assert.equal(state.history[0].finished_at, null);
});

test('does not resolve when the post-DDL checks fail', async (t) => {
  await t.test('DDL returned but the FK is still absent', async () => {
    const { state, run } = fixture();
    state.afterDdl = () => {};
    await assert.rejects(run);
    assert.equal(state.statements.length, 1);
    assert.equal(state.resolveCalls, 0);
  });
  await t.test('table definition changed while DDL ran', async () => {
    const { state, run } = fixture();
    state.afterDdl = () => {
      state.foreignKeys.push(correctForeignKey());
      state.columns.find((column) => column.name === 'humidity').nullable =
        'YES';
    };
    await assert.rejects(run);
    assert.equal(state.statements.length, 1);
    assert.equal(state.resolveCalls, 0);
  });
});

test('rejects a successful resolve command if the migration remains actively failed', async () => {
  const { state, run } = fixture();
  state.foreignKeys.push(correctForeignKey());
  state.resolveClearsHistory = false;
  await assert.rejects(run);
  assert.equal(state.resolveCalls, 1);
  assert.equal(state.events.at(-1), 'history');
  assert.equal(state.history[0].finished_at, null);
});
