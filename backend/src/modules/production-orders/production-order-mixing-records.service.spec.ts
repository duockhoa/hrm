import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderMixingRecordsService } from './production-order-mixing-records.service';
import * as uploads from './production-order-mixing-record-parameter-upload.config';

describe('Mixing parameter note and image attribution', () => {
  const timestamp = new Date('2026-10-14T03:00:00Z');
  let service: ProductionOrderMixingRecordsService;
  let update: jest.Mock;
  let findUnique: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(timestamp);
    findUnique = jest.fn().mockResolvedValue({
      id: 12,
      data_type: 'text',
      result_image_path: '/old-image.jpg',
      mixingRecordStep: {
        mixingRecordStage: { mixingRecord: { ipc_staff_approved_at: null } },
      },
    });
    update = jest
      .fn()
      .mockImplementation(async ({ data }) => ({ id: 12, ...data }));
    service = new ProductionOrderMixingRecordsService({
      productionOrderMixingRecordParameters: { findUnique, update },
    } as unknown as PrismaService);
    jest
      .spyOn(uploads, 'removeProductionOrderMixingRecordParameterImageByPath')
      .mockResolvedValue(undefined);
    jest
      .spyOn(uploads, 'getProductionOrderMixingRecordParameterImagePath')
      .mockReturnValue('/new-image.jpg');
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('attributes a note to its author without changing the result or image author', async () => {
    await service.updateParameterResult(
      12,
      { note: '  Đã kiểm tra  ' },
      { id: '7' },
    );
    expect(update.mock.calls[0][0].data).toEqual({
      note: 'Đã kiểm tra',
      note_recorded_by_id: 7,
      note_recorded_at: timestamp,
    });
    expect(update.mock.calls[0][0].include).toEqual(
      expect.objectContaining({
        noteRecordedBy: expect.any(Object),
        imageUploadedBy: expect.any(Object),
      }),
    );
  });

  it('attributes an uploaded replacement image without changing result or note attribution', async () => {
    await service.uploadParameterImage(12, {} as Express.Multer.File, {
      id: 8,
    });
    expect(update.mock.calls[0][0].data).toEqual({
      result_image_path: '/new-image.jpg',
      image_uploaded_by_id: 8,
      image_uploaded_at: timestamp,
    });
    expect(
      uploads.removeProductionOrderMixingRecordParameterImageByPath,
    ).toHaveBeenCalledWith('/old-image.jpg');
  });

  it('clears attribution when the note and image are removed', async () => {
    await service.updateParameterResult(
      12,
      { note: ' ', result_image_path: null },
      { id: 7 },
    );
    expect(update.mock.calls[0][0].data).toEqual({
      note: null,
      note_recorded_by_id: null,
      note_recorded_at: null,
      result_image_path: null,
      image_uploaded_by_id: null,
      image_uploaded_at: null,
    });
  });

  it('keeps note and image attribution when the result changes', async () => {
    await service.updateParameterResult(12, { result_value: 'Đạt' }, { id: 9 });
    expect(update.mock.calls[0][0].data).toEqual({
      result_value: 'Đạt',
      recorded_by_id: 9,
      recorded_at: timestamp,
    });
  });

  it('also attributes an image path saved through the result endpoint', async () => {
    await service.updateParameterResult(
      12,
      { result_image_path: '/new-image.jpg' },
      { id: 8 },
    );
    expect(update.mock.calls[0][0].data).toEqual({
      result_image_path: '/new-image.jpg',
      image_uploaded_by_id: 8,
      image_uploaded_at: timestamp,
    });
  });

  it('requires an authenticated author for notes and images', async () => {
    await expect(
      service.updateParameterResult(12, { note: 'Đạt' }),
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      service.uploadParameterImage(12, {} as Express.Multer.File),
    ).rejects.toThrow(UnauthorizedException);
    expect(update).not.toHaveBeenCalled();
  });

  it('keeps notes and images locked after IPC approval', async () => {
    findUnique.mockResolvedValue({
      id: 12,
      mixingRecordStep: {
        mixingRecordStage: {
          mixingRecord: { ipc_staff_approved_at: timestamp },
        },
      },
    });
    await expect(
      service.updateParameterResult(12, { note: 'Đạt' }, { id: 7 }),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.uploadParameterImage(12, {} as Express.Multer.File, { id: 8 }),
    ).rejects.toThrow(ForbiddenException);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('ProductionOrderMixingRecordsService', () => {
  it('does not create a record from an inactive mixing template', async () => {
    const create = jest.fn();
    const service = new ProductionOrderMixingRecordsService({
      productionOrders: {
        findUnique: jest.fn().mockResolvedValue({
          id: 11,
          item_code: 'TP00001',
        }),
      },
      mixingActivityTemplates: {
        findUnique: jest.fn().mockResolvedValue({
          id: 7,
          item_code: 'TP00001',
          status: 'inactive',
          stages: [],
        }),
      },
      productionOrderMixingRecords: { create },
    } as unknown as PrismaService);

    await expect(
      service.create(
        11,
        {
          mixing_activity_template_id: 7,
          record_type: 'mixing',
          description: 'Lô TP00001',
        },
        { id: 3 },
      ),
    ).rejects.toThrow(BadRequestException);

    expect(create).not.toHaveBeenCalled();
  });

  it('removes placeholder braces while copying a template into a record', async () => {
    const create = jest.fn().mockResolvedValue({ id: 21 });
    const service = new ProductionOrderMixingRecordsService({
      productionOrders: {
        findUnique: jest.fn().mockResolvedValue({
          id: 11,
          item_code: 'TP00001',
        }),
      },
      mixingActivityTemplates: {
        findUnique: jest.fn().mockResolvedValue({
          id: 7,
          item_code: 'TP00001',
          version: 1,
          status: 'active',
          stages: [
            {
              id: 1,
              stage_name: 'Giai đoạn {{number}}',
              stage_order: 1,
              steps: [
                {
                  id: 2,
                  step_name: '{{number}}',
                  step_order: 1,
                  parameters: [
                    {
                      id: 3,
                      parameter_name: 'Nhiệt độ {{number}}',
                      data_type: 'decimal',
                      unit: '{{ °C }}',
                      requirement: 'Đạt {{number}}',
                      parameter_order: 1,
                    },
                  ],
                },
              ],
            },
          ],
        }),
      },
      productionOrderMixingRecords: { create },
    } as unknown as PrismaService);

    await service.create(
      11,
      {
        mixing_activity_template_id: 7,
        record_type: 'mixing',
        description: 'Lô TP00001',
      },
      { id: 3 },
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          stages: {
            create: [
              expect.objectContaining({
                stage_name: 'Giai đoạn number',
                steps: {
                  create: [
                    expect.objectContaining({
                      step_name: 'number',
                      parameters: {
                        create: [
                          expect.objectContaining({
                            parameter_name: 'Nhiệt độ number',
                            unit: '°C',
                            requirement: 'Đạt number',
                          }),
                        ],
                      },
                    }),
                  ],
                },
              }),
            ],
          },
        }),
      }),
    );
  });
});
