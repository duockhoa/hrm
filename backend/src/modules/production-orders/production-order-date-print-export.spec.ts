import { ProductionOrdersService } from './production-orders.service';
import { PrismaService } from '../../prisma.service';

describe('production order date print template selection', () => {
  const prisma = {
    productionOrders: { findUnique: jest.fn() },
    datePrintTemplates: { findFirst: jest.fn() },
  };
  const service = new ProductionOrdersService(
    prisma as unknown as PrismaService,
    null!,
    null!,
    null!,
    null!,
    null!,
    null!,
  );

  beforeEach(() => jest.resetAllMocks());

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
