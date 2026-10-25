import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductionOrderWeighingStageImportService } from './production-order-weighing-stage-import.service';

describe('Weighing stage import', () => {
  let service: ProductionOrderWeighingStageImportService;
  let prisma: any;
  let orders: any;
  let writer: any;
  const material = {
    StageID: 2,
    ItemType: 'pit_Item',
    LineNumber: 0,
    ItemNo: 'NL001',
    ItemName: 'Material A',
    U_SL: 'LOT-A',
    PlannedQuantity: '12.345678',
    ProductionOrdersStage: { StageID: 2, Name: 'Weighing' },
    UnitOfMeasurement: { Code: 'kg' },
  };
  beforeEach(() => {
    prisma = {
      productionOrderWeighingRecords: {
        findUnique: jest.fn().mockResolvedValue({ production_order_id: 42 }),
      },
      productionOrderWeighingRecordLines: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    orders = {
      findProductionOrderLines: jest.fn().mockResolvedValue([
        material,
        { ...material, LineNumber: 1, ItemNo: 'NL002', U_SL: 'LOT-B' },
        { ...material, LineNumber: 2, ItemType: 'pit_Resource' },
        {
          ...material,
          StageID: 3,
          ProductionOrdersStage: { Name: 'Packing' },
        },
      ]),
    };
    writer = {
      importStage: jest.fn().mockResolvedValue([{ id: 1 }]),
      importLines: jest.fn().mockResolvedValue([{ id: 1 }]),
    };
    service = new ProductionOrderWeighingStageImportService(
      prisma,
      orders,
      writer,
    );
  });

  it('lists source materials including unstaged materials and marks imported source lines', async () => {
    orders.findProductionOrderLines.mockResolvedValue([
      material,
      {
        ...material,
        LineNumber: 1,
        StageID: null,
        ProductionOrdersStage: null,
      },
      { ...material, LineNumber: 2, ItemType: 'pit_Resource' },
    ]);
    prisma.productionOrderWeighingRecordLines.findMany.mockResolvedValue([
      { source_line_number: 0 },
    ]);
    expect(await service.sourceMaterials(7)).toEqual([
      expect.objectContaining({ source_line_number: 0, imported: true }),
      expect.objectContaining({
        source_line_number: 1,
        source_stage_id: null,
        stage_name: null,
        imported: false,
      }),
    ]);
  });

  it('copies only selected source lines with server-sourced values', async () => {
    await service.importLines(7, { line_numbers: [1] });
    expect(writer.importLines).toHaveBeenCalledWith(7, [
      expect.objectContaining({
        source_line_number: 1,
        item_code: 'NL002',
        lot_no: 'LOT-B',
        planned_quantity: '12.345678',
        source_stage_id: 2,
      }),
    ]);
  });

  it.each([
    {},
    { line_numbers: [] },
    { line_numbers: [0, 0] },
    { line_numbers: ['0'] },
    { line_numbers: [-1] },
    { line_numbers: [0.5] },
    { line_numbers: [0], item_code: 'spoofed' },
  ])('rejects invalid manual selection %j', async (dto) => {
    await expect(service.importLines(7, dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(writer.importLines).not.toHaveBeenCalled();
  });

  it.each([{ numbers: [99] }, { numbers: [2] }, { numbers: [0, 99] }])(
    'rejects foreign or non-material source lines $numbers',
    async ({ numbers }) => {
      await expect(
        service.importLines(7, { line_numbers: numbers }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(writer.importLines).not.toHaveBeenCalled();
    },
  );

  it('does not load source lines for a missing manual-import parent', async () => {
    prisma.productionOrderWeighingRecords.findUnique.mockResolvedValue(null);
    await expect(
      service.importLines(7, { line_numbers: [0] }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(orders.findProductionOrderLines).not.toHaveBeenCalled();
  });

  it('lists only material stages with counts and imported flags', async () => {
    prisma.productionOrderWeighingRecordLines.findMany.mockResolvedValue([
      { source_stage_id: 3 },
    ]);
    expect(await service.stages(7)).toEqual([
      { id: 2, name: 'Weighing', material_count: 2, imported: false },
      { id: 3, name: 'Packing', material_count: 1, imported: true },
    ]);
    expect(orders.findProductionOrderLines).toHaveBeenCalledWith(42);
  });

  it('copies all materials of exactly the selected stage from the owning order', async () => {
    await service.importStage(7, { stage_id: 2 });
    expect(writer.importStage).toHaveBeenCalledWith(7, 2, [
      {
        source_line_number: 0,
        source_stage_id: 2,
        stage_name: 'Weighing',
        item_code: 'NL001',
        item_name: 'Material A',
        lot_no: 'LOT-A',
        planned_quantity: '12.345678',
        unit: 'kg',
        note: null,
      },
      {
        source_line_number: 1,
        source_stage_id: 2,
        stage_name: 'Weighing',
        item_code: 'NL002',
        item_name: 'Material A',
        lot_no: 'LOT-B',
        planned_quantity: '12.345678',
        unit: 'kg',
        note: null,
      },
    ]);
  });

  it('handles missing lot and UoM relation without losing the source unit', async () => {
    orders.findProductionOrderLines.mockResolvedValue([
      {
        ...material,
        U_SL: null,
        UnitOfMeasurement: null,
        UoMCode: 'g',
        PlannedQuantity: '0.000001',
      },
    ]);
    await service.importStage(7, { stage_id: 2 });
    expect(writer.importStage.mock.calls[0][2][0]).toMatchObject({
      lot_no: null,
      unit: 'g',
      planned_quantity: '0.000001',
    });
  });

  it.each([
    {},
    { stage_id: '2' },
    { stage_id: -1 },
    { stage_id: 2.1 },
    { stage_id: 2, production_order_id: 99 },
  ])('rejects invalid selection %j', async (dto) => {
    await expect(service.importStage(7, dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(writer.importStage).not.toHaveBeenCalled();
  });

  it('does not fetch SAP or write for a missing or inaccessible record', async () => {
    prisma.productionOrderWeighingRecords.findUnique.mockResolvedValue(null);
    await expect(
      service.importStage(7, { stage_id: 2 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(orders.findProductionOrderLines).not.toHaveBeenCalled();
  });

  it('rejects a stage outside the owning order', async () => {
    await expect(
      service.importStage(7, { stage_id: 999 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(writer.importStage).not.toHaveBeenCalled();
  });

  it.each(['invalid', '0', '-1', '0.0000001', '1000000000000'])(
    'rejects invalid source quantity %s before writing any rows',
    async (value) => {
      orders.findProductionOrderLines.mockResolvedValue([
        material,
        { ...material, PlannedQuantity: value },
      ]);
      await expect(
        service.importStage(7, { stage_id: 2 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(writer.importStage).not.toHaveBeenCalled();
    },
  );
});
