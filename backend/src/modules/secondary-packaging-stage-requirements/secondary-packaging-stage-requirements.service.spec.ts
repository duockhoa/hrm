import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { SecondaryPackagingStageRequirementsService } from './secondary-packaging-stage-requirements.service';

describe('SecondaryPackagingStageRequirementsService', () => {
  let service: SecondaryPackagingStageRequirementsService;
  let prismaService: {
    secondaryPackagingStageRequirements: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      secondaryPackagingStageRequirements: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecondaryPackagingStageRequirementsService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get(SecondaryPackagingStageRequirementsService);
  });

  it('creates a requirement with the authenticated creator', async () => {
    prismaService.secondaryPackagingStageRequirements.create.mockResolvedValue({
      id: 1,
    });

    await service.create(
      {
        stage: ' Đóng hộp ',
        requirement: ' Nhãn và số lô đúng quy định ',
      },
      { id: 7 },
    );

    expect(
      prismaService.secondaryPackagingStageRequirements.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          stage: 'Đóng hộp',
          requirement: 'Nhãn và số lô đúng quy định',
          created_by_id: 7,
        },
      }),
    );
  });

  it('rejects an empty stage', async () => {
    await expect(
      service.create(
        { stage: ' ', requirement: 'Nhãn đúng quy định' },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates a requirement', async () => {
    prismaService.secondaryPackagingStageRequirements.findUnique.mockResolvedValue(
      { id: 1 },
    );
    prismaService.secondaryPackagingStageRequirements.update.mockResolvedValue({
      id: 1,
      requirement: 'Quy cách mới',
    });

    await service.update(1, { requirement: ' Quy cách mới ' });

    expect(
      prismaService.secondaryPackagingStageRequirements.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { requirement: 'Quy cách mới' },
      }),
    );
  });

  it('throws NotFoundException for an unknown requirement', async () => {
    prismaService.secondaryPackagingStageRequirements.findUnique.mockResolvedValue(
      null,
    );

    await expect(service.findById(1)).rejects.toBeInstanceOf(NotFoundException);
  });
});
