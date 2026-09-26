import { ProductionOrdersService } from './production-orders.service';
import { PrismaService } from '../../prisma.service';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { ProductionOrdersController } from './production-orders.controller';
import { ProductionOrderExportService } from './exports/production-order-export.service';

describe('production order date print template selection', () => {
  const prisma = {
    productionOrders: { findUnique: jest.fn() },
    datePrintTemplates: { findFirst: jest.fn(), findMany: jest.fn() },
  };
  const exporter = { exportDatePrintPdf: jest.fn() };
  const service = new ProductionOrdersService(
    prisma as unknown as PrismaService,
    null!,
    null!,
    null!,
    null!,
    exporter as unknown as ProductionOrderExportService,
    null!,
  );

  beforeEach(() => jest.resetAllMocks());

  it('uses temporary edits for PDF export without changing the original template', async () => {
    const template = Object.freeze({ id: 22, print_position: 'Vị trí gốc', print_content: 'Nội dung gốc' });
    prisma.productionOrders.findUnique.mockResolvedValue({ id: 1, item_code: 'SP01' });
    prisma.datePrintTemplates.findFirst.mockResolvedValue(template);
    exporter.exportDatePrintPdf.mockResolvedValue({ buffer: Buffer.from('pdf') });

    await service.exportDatePrint(1, 22, 'pdf', '', {
      print_position: '', print_content: 'Nội dung mới\nDòng thứ hai',
    });
    expect(exporter.exportDatePrintPdf).toHaveBeenLastCalledWith(
      expect.anything(), { ...template, print_position: '', print_content: 'Nội dung mới\nDòng thứ hai' }, '',
    );
    expect(template.print_content).toBe('Nội dung gốc');
    expect(template.print_position).toBe('Vị trí gốc');

    await service.exportDatePrint(1, 22, 'pdf');
    expect(exporter.exportDatePrintPdf).toHaveBeenLastCalledWith(expect.anything(), template, '');
  });

  it.each([
    { print_content: 'a'.repeat(20001) },
    { print_position: 'a'.repeat(2001) },
    { print_content: 42 as unknown as string },
  ])('rejects invalid temporary edits before reading data', async (overrides) => {
    await expect(service.exportDatePrint(1, 22, 'pdf', '', overrides)).rejects.toThrow('phải là chuỗi');
    expect(prisma.productionOrders.findUnique).not.toHaveBeenCalled();
  });

  it('rejects unsupported export formats before reading data', async () => {
    await expect(service.exportDatePrint(1, 22, 'html')).rejects.toThrow('Định dạng xuất');
    expect(prisma.productionOrders.findUnique).not.toHaveBeenCalled();
  });

  it('lists only active templates for the production order item', async () => {
    prisma.productionOrders.findUnique.mockResolvedValue({ id: 1, item_code: 'SP01' });
    prisma.datePrintTemplates.findMany.mockResolvedValue([]);
    await service.findDatePrintExportTemplates(1);
    expect(prisma.datePrintTemplates.findMany).toHaveBeenCalledWith({
      where: { item_code: 'SP01', status: 'active' },
      orderBy: { version: 'desc' },
    });
  });

  it('only allows active templates belonging to the production order item', async () => {
    prisma.productionOrders.findUnique.mockResolvedValue({
      id: 1,
      item_code: 'SP01',
    });
    prisma.datePrintTemplates.findFirst.mockResolvedValue(null);
    await expect(service.exportDatePrint(1, 22)).rejects.toThrow(
      'Biểu mẫu in date không thuộc',
    );
    expect(prisma.datePrintTemplates.findFirst).toHaveBeenCalledWith({
      where: { id: 22, item_code: 'SP01', status: 'active' },
    });
  });

  it('rejects missing production orders', async () => {
    prisma.productionOrders.findUnique.mockResolvedValue(null);
    await expect(service.exportDatePrint(1, 22)).rejects.toThrow(
      'Production order not found',
    );
    expect(prisma.datePrintTemplates.findFirst).not.toHaveBeenCalled();
  });
});

describe('date print export authorization', () => {
  const guard = new PermissionsGuard(new Reflector());
  it.each(['exportDatePrint', 'exportDatePrintWithOverrides', 'findDatePrintExportTemplates'] as const)(
    '%s requires the dedicated permission',
    (route) => {
      const context = (permissions: string[]) => ({
        getHandler: () => ProductionOrdersController.prototype[route],
        getClass: () => ProductionOrdersController,
        switchToHttp: () => ({ getRequest: () => ({ user: { permissions } }) }),
      }) as unknown as ExecutionContext;
      expect(guard.canActivate(context([]))).toBe(false);
      expect(guard.canActivate(context(['production-orders.export']))).toBe(false);
      expect(guard.canActivate(context(['date-print-templates.read']))).toBe(false);
      expect(guard.canActivate(context(['production-orders.export-date-print']))).toBe(true);
    },
  );
});
