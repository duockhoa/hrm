import { PrismaService } from 'src/prisma.service';
import { ProductionOrderDateChecksService } from './production-order-date-checks.service';

describe('ProductionOrderDateChecksService global list', () => {
  const findMany = jest.fn();
  const groupBy = jest.fn();
  const findImages = jest.fn();
  let service: ProductionOrderDateChecksService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new ProductionOrderDateChecksService({
      productionOrderDateChecks: { findMany },
      productionOrderDateCheckImages: { groupBy, findMany: findImages },
    } as unknown as PrismaService);
  });

  it('matches the latest image times to their checks, including checks without images', async () => {
    const checkedAt = new Date('2026-10-10T01:00:00Z');
    const firstUpload = new Date('2026-10-11T02:00:00Z');
    const secondUpload = new Date('2026-10-11T03:00:00Z');
    const firstUploader = { id: 7, name: 'First uploader' };
    const secondUploader = { id: 8, name: 'Second uploader' };
    const checks = [
      { id: 1, production_order_id: 2001, checked_at: checkedAt },
      { id: 2, production_order_id: 2002, checked_at: checkedAt },
      { id: 3, production_order_id: 2003, checked_at: checkedAt },
    ];
    findMany.mockResolvedValue(checks);
    groupBy.mockResolvedValue([
      { date_check_id: 2, _max: { created_at: secondUpload } },
      { date_check_id: 1, _max: { created_at: firstUpload } },
    ]);
    findImages.mockResolvedValue([
      { date_check_id: 2, created_at: secondUpload, createdBy: secondUploader },
      { date_check_id: 1, created_at: firstUpload, createdBy: firstUploader },
    ]);

    await expect(service.findAll()).resolves.toEqual([
      {
        ...checks[0],
        last_image_uploaded_at: firstUpload,
        last_image_uploaded_by: firstUploader,
      },
      {
        ...checks[1],
        last_image_uploaded_at: secondUpload,
        last_image_uploaded_by: secondUploader,
      },
      {
        ...checks[2],
        last_image_uploaded_at: null,
        last_image_uploaded_by: null,
      },
    ]);
    // The list needs timestamps, not full image metadata or one query per check.
    expect(findMany.mock.calls[0][0].include.images).toBe(false);
    expect(groupBy).toHaveBeenCalledTimes(1);
    expect(groupBy).toHaveBeenCalledWith({
      by: ['date_check_id'],
      where: { date_check_id: { in: [1, 2, 3] } },
      _max: { created_at: true },
    });
    expect(findImages).toHaveBeenCalledTimes(1);
    expect(findImages).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { date_check_id: 2, created_at: secondUpload },
            { date_check_id: 1, created_at: firstUpload },
          ],
        },
        orderBy: { id: 'desc' },
        distinct: ['date_check_id'],
      }),
    );
  });

  it('skips the image query when no checks exist', async () => {
    findMany.mockResolvedValue([]);
    await expect(service.findAll()).resolves.toEqual([]);
    expect(groupBy).not.toHaveBeenCalled();
    expect(findImages).not.toHaveBeenCalled();
  });

  it('skips uploader lookups when all checks have no images', async () => {
    findMany.mockResolvedValue([{ id: 1 }]);
    groupBy.mockResolvedValue([]);
    await expect(service.findAll()).resolves.toEqual([
      { id: 1, last_image_uploaded_at: null, last_image_uploaded_by: null },
    ]);
    expect(findImages).not.toHaveBeenCalled();
  });
});
