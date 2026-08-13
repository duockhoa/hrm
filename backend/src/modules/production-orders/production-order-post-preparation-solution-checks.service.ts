import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderPostPreparationSolutionCheckDto } from './dto/create-production-order-post-preparation-solution-check.dto';
import { UpdateProductionOrderPostPreparationSolutionCheckDto } from './dto/update-production-order-post-preparation-solution-check.dto';
import {
  getPostPreparationSolutionCheckImageLookupPaths,
  removePostPreparationSolutionCheckImageByPath,
  resolvePostPreparationSolutionCheckImageFile,
} from './production-order-post-preparation-solution-check-upload.config';

const PH_DECIMAL_PATTERN = /^(?:\d+)(?:\.\d{1,2})?$/;

const checkerSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const postPreparationSolutionCheckInclude = {
  checkedBy: {
    select: checkerSelect,
  },
} satisfies Prisma.ProductionOrderPostPreparationSolutionChecksInclude;

const postPreparationSolutionCheckImageSelect = {
  id: true,
  final_volume_image_path: true,
  solution_image_path: true,
} satisfies Prisma.ProductionOrderPostPreparationSolutionChecksSelect;

type PostPreparationSolutionCheckImages =
  Prisma.ProductionOrderPostPreparationSolutionChecksGetPayload<{
    select: typeof postPreparationSolutionCheckImageSelect;
  }>;

type SolutionCheckFiles = {
  finalVolumeImagePath?: string;
  solutionImagePath?: string;
};

@Injectable()
export class ProductionOrderPostPreparationSolutionChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(checkId: number) {
    const check =
      await this.prismaService.productionOrderPostPreparationSolutionChecks.findUnique(
        {
          where: { id: checkId },
          include: postPreparationSolutionCheckInclude,
        },
      );

    if (!check) {
      throw new NotFoundException('Post-preparation solution check not found');
    }

    return check;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderPostPreparationSolutionChecks.findMany(
      {
        where: { production_order_id: productionOrderId },
        include: postPreparationSolutionCheckInclude,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      },
    );
  }

  async findImageFile(filename: string) {
    const imagePaths =
      getPostPreparationSolutionCheckImageLookupPaths(filename);

    if (imagePaths.length === 0) {
      return null;
    }

    const check =
      await this.prismaService.productionOrderPostPreparationSolutionChecks.findFirst(
        {
          where: {
            OR: [
              { final_volume_image_path: { in: imagePaths } },
              { solution_image_path: { in: imagePaths } },
            ],
          },
          select: { id: true },
        },
      );

    if (!check) {
      return null;
    }

    return resolvePostPreparationSolutionCheckImageFile(filename);
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderPostPreparationSolutionCheckDto,
    files: SolutionCheckFiles = {},
  ) {
    await this.ensureProductionOrderExists(productionOrderId);
    const data = this.normalizeData(dto);

    if (data.checked_by_id !== null) {
      await this.ensureUserExists(data.checked_by_id);
    }

    return this.prismaService.productionOrderPostPreparationSolutionChecks.create(
      {
        data: {
          production_order_id: productionOrderId,
          ...data,
          final_volume_image_path: files.finalVolumeImagePath ?? null,
          solution_image_path: files.solutionImagePath ?? null,
        },
        include: postPreparationSolutionCheckInclude,
      },
    );
  }

  async update(
    checkId: number,
    dto: UpdateProductionOrderPostPreparationSolutionCheckDto,
    files: SolutionCheckFiles = {},
  ) {
    const existingCheck = await this.findImagesByIdOrThrow(checkId);
    const data = this.normalizeUpdateData(dto, files);

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    if (typeof data.checked_by_id === 'number' && data.checked_by_id !== null) {
      await this.ensureUserExists(data.checked_by_id);
    }

    const updatedCheck =
      await this.prismaService.productionOrderPostPreparationSolutionChecks.update(
        {
          where: { id: checkId },
          data,
          include: postPreparationSolutionCheckInclude,
        },
      );

    await this.removeReplacedImages(existingCheck, files);

    return updatedCheck;
  }

  async delete(checkId: number) {
    const existingCheck = await this.findImagesByIdOrThrow(checkId);

    const deletedCheck =
      await this.prismaService.productionOrderPostPreparationSolutionChecks.delete(
        {
          where: { id: checkId },
          include: postPreparationSolutionCheckInclude,
        },
      );

    await Promise.all([
      removePostPreparationSolutionCheckImageByPath(
        existingCheck.final_volume_image_path,
      ),
      removePostPreparationSolutionCheckImageByPath(
        existingCheck.solution_image_path,
      ),
    ]);

    return deletedCheck;
  }

  private async ensureProductionOrderExists(productionOrderId: number) {
    const productionOrder =
      await this.prismaService.productionOrders.findUnique({
        where: { id: productionOrderId },
        select: { id: true },
      });

    if (!productionOrder) {
      throw new NotFoundException('Production order not found');
    }
  }

  private async ensureUserExists(userId: number) {
    const user = await this.prismaService.users.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Checked user not found');
    }
  }

  private async findImagesByIdOrThrow(checkId: number) {
    const check =
      await this.prismaService.productionOrderPostPreparationSolutionChecks.findUnique(
        {
          where: { id: checkId },
          select: postPreparationSolutionCheckImageSelect,
        },
      );

    if (!check) {
      throw new NotFoundException('Post-preparation solution check not found');
    }

    return check;
  }

  private normalizeData(
    dto:
      | CreateProductionOrderPostPreparationSolutionCheckDto
      | UpdateProductionOrderPostPreparationSolutionCheckDto,
  ) {
    const normalizedCheckedById = this.normalizeOptionalInt(
      dto?.checked_by_id,
      'checked_by_id',
    );

    return {
      solution_color: this.normalizeOptionalText(
        dto?.solution_color,
        'solution_color',
      ),
      solution_clarity: this.normalizeOptionalText(
        dto?.solution_clarity,
        'solution_clarity',
      ),
      solution_ph_1: this.normalizeOptionalPh(
        dto?.solution_ph_1,
        'solution_ph_1',
      ),
      solution_ph_2: this.normalizeOptionalPh(
        dto?.solution_ph_2,
        'solution_ph_2',
      ),
      solution_ph_3: this.normalizeOptionalPh(
        dto?.solution_ph_3,
        'solution_ph_3',
      ),
      checked_by_id: normalizedCheckedById,
    };
  }

  private normalizeUpdateData(
    dto: UpdateProductionOrderPostPreparationSolutionCheckDto,
    files: SolutionCheckFiles,
  ) {
    const updateDto = dto ?? {};
    const data: Prisma.ProductionOrderPostPreparationSolutionChecksUncheckedUpdateInput =
      {};

    if ('solution_color' in updateDto) {
      data.solution_color = this.normalizeOptionalText(
        updateDto.solution_color,
        'solution_color',
      );
    }

    if ('solution_clarity' in updateDto) {
      data.solution_clarity = this.normalizeOptionalText(
        updateDto.solution_clarity,
        'solution_clarity',
      );
    }

    if ('solution_ph_1' in updateDto) {
      data.solution_ph_1 = this.normalizeOptionalPh(
        updateDto.solution_ph_1,
        'solution_ph_1',
      );
    }

    if ('solution_ph_2' in updateDto) {
      data.solution_ph_2 = this.normalizeOptionalPh(
        updateDto.solution_ph_2,
        'solution_ph_2',
      );
    }

    if ('solution_ph_3' in updateDto) {
      data.solution_ph_3 = this.normalizeOptionalPh(
        updateDto.solution_ph_3,
        'solution_ph_3',
      );
    }

    if ('checked_by_id' in updateDto) {
      data.checked_by_id = this.normalizeOptionalInt(
        updateDto.checked_by_id,
        'checked_by_id',
      );
    }

    if (files.finalVolumeImagePath) {
      data.final_volume_image_path = files.finalVolumeImagePath;
    }

    if (files.solutionImagePath) {
      data.solution_image_path = files.solutionImagePath;
    }

    return data;
  }

  private normalizeOptionalText(value: unknown, fieldName: string) {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string`);
    }

    const normalizedValue = value.trim();

    return normalizedValue === '' ? null : normalizedValue;
  }

  private normalizeOptionalPh(value: unknown, fieldName: string) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      return null;
    }

    const normalizedValue =
      typeof value === 'number'
        ? String(value)
        : String(value).trim().replace(',', '.');

    if (!PH_DECIMAL_PATTERN.test(normalizedValue)) {
      throw new BadRequestException(
        `${fieldName} must fit DECIMAL(5, 2) with up to 2 decimal places`,
      );
    }

    const decimalValue = new Prisma.Decimal(normalizedValue);

    if (decimalValue.lt(0) || decimalValue.gt(14)) {
      throw new BadRequestException(`${fieldName} must be between 0 and 14`);
    }

    return decimalValue;
  }

  private normalizeOptionalInt(value: unknown, fieldName: string) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      return null;
    }

    const normalizedValue = Number(value);

    if (!Number.isInteger(normalizedValue) || normalizedValue <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    return normalizedValue;
  }

  private async removeReplacedImages(
    existingCheck: PostPreparationSolutionCheckImages,
    files: SolutionCheckFiles,
  ) {
    const removals: Promise<void>[] = [];

    if (
      files.finalVolumeImagePath &&
      existingCheck.final_volume_image_path &&
      existingCheck.final_volume_image_path !== files.finalVolumeImagePath
    ) {
      removals.push(
        removePostPreparationSolutionCheckImageByPath(
          existingCheck.final_volume_image_path,
        ),
      );
    }

    if (
      files.solutionImagePath &&
      existingCheck.solution_image_path &&
      existingCheck.solution_image_path !== files.solutionImagePath
    ) {
      removals.push(
        removePostPreparationSolutionCheckImageByPath(
          existingCheck.solution_image_path,
        ),
      );
    }

    await Promise.all(removals);
  }
}
