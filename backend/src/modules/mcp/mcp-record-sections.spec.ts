import { Prisma } from '@prisma/client';
import { recordSections } from './mcp-record-sections';
import {
  itemSearchSelect,
  itemDetailSelect,
  itemMixingTemplateSelect,
  itemDatePrintTemplateSelect,
} from './mcp-item-selects';

describe('MCP record registry matches Prisma relations', () => {
  const models = Prisma.dmmf.datamodel.models;
  const orderModel = models.find((model) => model.name === 'ProductionOrders')!;

  function validateSelect(modelName: string, select: Record<string, unknown>) {
    const model = models.find((entry) => entry.name === modelName)!;
    expect(model).toBeDefined();
    for (const [key, value] of Object.entries(select)) {
      const field = model.fields.find((entry) => entry.name === key);
      expect(field).toBeDefined();
      if (!field || field.kind !== 'object') continue;
      const nested = value as { select: Record<string, unknown> };
      expect(nested.select).toBeDefined();
      if (field.type === 'Users') {
        expect(nested.select).toEqual({ id: true, name: true, username: true });
      }
      validateSelect(field.type, nested.select);
    }
  }

  it.each(Object.entries(recordSections))(
    '%s selects valid fields for its exact parent relation',
    (_section, config) => {
      const relation = orderModel.fields.find(
        (field) => field.name === config.relation,
      )!;
      expect(relation).toBeDefined();
      expect(relation.kind).toBe('object');
      expect(relation.isList).toBe(!config.singleton);
      const child = models.find((model) => model.name === relation.type)!;
      expect(
        child.fields.find((field) => field.name === config.dateField)?.type,
      ).toBe('DateTime');
      validateSelect(relation.type, config.select);
    },
  );

  it.each([
    ['Items', itemSearchSelect],
    ['Items', itemDetailSelect],
    ['MixingActivityTemplates', itemMixingTemplateSelect],
    ['DatePrintTemplates', itemDatePrintTemplateSelect],
  ] as [string, Record<string, unknown>][])(
    'validates safe item selections for %s',
    (name, select) => validateSelect(name, select),
  );
});
