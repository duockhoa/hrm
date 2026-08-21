import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { DosageFormsService } from './dosage-forms.service';

describe('DosageFormsService', () => {
  let service: DosageFormsService;
  let prismaService: {
    dosageForms: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DosageFormsService,
        {
          provide: PrismaService,
          useValue: {
            dosageForms: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DosageFormsService>(DosageFormsService);
    prismaService = module.get(PrismaService);
  });

  it('creates a dosage form with a normalized sensory requirement', async () => {
    prismaService.dosageForms.findUnique.mockResolvedValue(null);
    prismaService.dosageForms.create.mockResolvedValue({ id: 1 });

    await service.create(
      {
        name: ' Viên nén ',
        sensory_requirement: '  Bề mặt đồng đều, không nứt vỡ.  ',
      },
      { id: 7 },
    );

    expect(prismaService.dosageForms.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          name: 'Viên nén',
          sensory_requirement: 'Bề mặt đồng đều, không nứt vỡ.',
          created_by_id: 7,
        },
      }),
    );
  });

  it('updates only the sensory requirement and clears an empty value', async () => {
    prismaService.dosageForms.findUnique.mockResolvedValue({ id: 1 });
    prismaService.dosageForms.update.mockResolvedValue({
      id: 1,
      sensory_requirement: null,
    });

    await service.update(1, { sensory_requirement: '   ' });

    expect(prismaService.dosageForms.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { sensory_requirement: null },
      }),
    );
  });

  it('rejects a non-string sensory requirement', async () => {
    prismaService.dosageForms.findUnique.mockResolvedValue({ id: 1 });

    await expect(
      service.update(1, { sensory_requirement: 123 as unknown as string }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
