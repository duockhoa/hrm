import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { recordPagination } from '../../common/utils/record-list-query';
import { GetProductionOrderDateChecksDto } from './dto/get-production-order-date-checks.dto';
import {
  approvalLabels,
  packageLabels,
  productionOrderDateCheckListWhere,
} from './production-order-date-check-list-query';
import { normalizeLotSearch } from './production-order-list-query';
import { ApproveProductionOrderDateCheckDto } from './dto/approve-production-order-date-check.dto';
import { CreateProductionOrderDateCheckDto } from './dto/create-production-order-date-check.dto';
import { UpdateProductionOrderDateCheckDto } from './dto/update-production-order-date-check.dto';
import {
  getDateCheckImageLookupPaths,
  getDateCheckRequestFileLookupPaths,
  removeStoredDateCheckImage,
  removeStoredDateCheckImages,
  removeStoredDateCheckRequestFile,
  resolveDateCheckImageFile,
  resolveDateCheckRequestFile,
} from './production-order-date-check-upload.config';

type AuthenticatedUser = {
  id?: number | string | null;
};

const DATE_CHECK_APPROVAL_STATUS = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
} as const;

const productionOrderDateCheckUserSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  avatar: true,
  department: true,
  position: true,
  status: true,
};

const productionOrderDateCheckInclude = {
  productionOrder: {
    include: {
      item: true,
    },
  },
  createdBy: {
    select: productionOrderDateCheckUserSelect,
  },
  approvedBy: {
    select: productionOrderDateCheckUserSelect,
  },
  images: {
    include: {
      createdBy: {
        select: productionOrderDateCheckUserSelect,
      },
    },
    orderBy: [
      {
        created_at: 'asc' as const,
      },
      {
        id: 'asc' as const,
      },
    ],
  },
} satisfies Prisma.ProductionOrderDateChecksInclude;

const productionOrderDateCheckListInclude = {
  ...productionOrderDateCheckInclude,
  images: false,
} satisfies Prisma.ProductionOrderDateChecksInclude;

type DateCheckListRow = Prisma.ProductionOrderDateChecksGetPayload<{
  include: typeof productionOrderDateCheckListInclude;
}>;

type DateCheckImageListRow = DateCheckListRow & {
  last_image_uploaded_at: Date | null;
  last_image_uploaded_by: {
    name?: string | null;
    username?: string | null;
    email?: string | null;
  } | null;
};

const userLabel = (user: DateCheckImageListRow['last_image_uploaded_by']) =>
  user?.name ?? user?.username ?? user?.email ?? '';

const formatSearchDate = (date: Date | null | undefined) =>
  date?.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }) ?? '';

const matchesImageListSearch = (
  check: DateCheckImageListRow,
  search: string,
) => {
  const order = check.productionOrder;
  return [
    check.id,
    check.production_order_id,
    order?.production_order_code,
    order?.lot_no,
    order?.item_code,
    order?.item?.item_name ?? order?.description ?? order?.item_code,
    check.package_type,
    packageLabels[check.package_type] ?? check.package_type,
    check.approval_status,
    approvalLabels[check.approval_status] ?? check.approval_status,
    check.request_file_path,
    check.created_at?.toISOString(),
    formatSearchDate(check.created_at),
    check.checked_at?.toISOString(),
    formatSearchDate(check.checked_at),
    check.last_image_uploaded_at?.toISOString(),
    formatSearchDate(check.last_image_uploaded_at),
    userLabel(check.last_image_uploaded_by),
    userLabel(check.createdBy),
    userLabel(check.approvedBy),
  ].some((value) => normalizeLotSearch(value).includes(search));
};

@Injectable()
export class ProductionOrderDateChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(options: GetProductionOrderDateChecksDto = {}) {
    const where = productionOrderDateCheckListWhere(options);
    const pagination = recordPagination(options);
    if (options.order_by === 'last_image_uploaded_at') {
      if (options.has_images !== 'true') {
        throw new BadRequestException(
          'order_by=last_image_uploaded_at requires has_images=true',
        );
      }
      const search = normalizeLotSearch(options.search).trim();
      const imageListWhere = search
        ? productionOrderDateCheckListWhere({ ...options, search: undefined })
        : where;
      const { data, total } = await this.findByLatestImage(
        imageListWhere,
        pagination,
        search,
      );
      return pagination.enabled
        ? { data, total, page: pagination.page, limit: pagination.limit }
        : data;
    }
    const query = {
      ...(Object.keys(where).length ? { where } : {}),
      include: productionOrderDateCheckListInclude,
      orderBy: [{ created_at: 'desc' as const }, { id: 'desc' as const }],
      ...pagination.args,
    };
    const [checks, total] = pagination.enabled
      ? await this.prismaService.$transaction(
          [
            this.prismaService.productionOrderDateChecks.findMany(query),
            this.prismaService.productionOrderDateChecks.count({ where }),
          ],
          { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
        )
      : [await this.prismaService.productionOrderDateChecks.findMany(query), 0];
    const data = await this.addLatestImageInfo(checks);
    return pagination.enabled
      ? { data, total, page: pagination.page, limit: pagination.limit }
      : data;
  }

  private async findByLatestImage(
    where: Prisma.ProductionOrderDateChecksWhereInput,
    pagination: ReturnType<typeof recordPagination>,
    search = '',
  ) {
    const read = async (client: Prisma.TransactionClient) => {
      // Rank all matching checks by their latest upload before taking a page.
      const uploads = await client.productionOrderDateCheckImages.groupBy({
        by: ['date_check_id'],
        where: { dateCheck: { is: where } },
        _max: { created_at: true },
        orderBy: [{ _max: { created_at: 'desc' } }, { date_check_id: 'desc' }],
        ...(search ? {} : pagination.args),
      });
      const total =
        pagination.enabled && !search
          ? await client.productionOrderDateChecks.count({ where })
          : 0;
      const checks = uploads.length
        ? await client.productionOrderDateChecks.findMany({
            where: {
              AND: [
                where,
                { id: { in: uploads.map((upload) => upload.date_check_id) } },
              ],
            },
            include: productionOrderDateCheckListInclude,
          })
        : [];
      const checksById = new Map(checks.map((check) => [check.id, check]));
      const orderedChecks = uploads.flatMap((upload) => {
        const check = checksById.get(upload.date_check_id);
        return check ? [check] : [];
      });
      const data = await this.addLatestImageInfo(orderedChecks, client);
      if (!search) return { data, total };

      // Search the same projection as the image list, including only its latest
      // uploader. Filtering before slicing preserves full-list search results.
      const matches = data
        .filter((check) => matchesImageListSearch(check, search))
        .sort(
          (a, b) =>
            (b.last_image_uploaded_at?.getTime() ?? 0) -
              (a.last_image_uploaded_at?.getTime() ?? 0) || b.id - a.id,
        );
      const skip = (pagination.page - 1) * pagination.limit;
      return {
        data: pagination.enabled
          ? matches.slice(skip, skip + pagination.limit)
          : matches,
        total: matches.length,
      };
    };

    return pagination.enabled
      ? this.prismaService.$transaction(read, {
          isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        })
      : read(this.prismaService);
  }

  private async addLatestImageInfo(
    checks: DateCheckListRow[],
    client: Prisma.TransactionClient = this.prismaService,
  ) {
    if (checks.length === 0) {
      return [];
    }

    const latestUploads = await client.productionOrderDateCheckImages.groupBy({
      by: ['date_check_id'],
      where: { date_check_id: { in: checks.map((check) => check.id) } },
      _max: { created_at: true },
    });
    const latestUploadFilters = latestUploads.flatMap((upload) =>
      upload._max.created_at
        ? [
            {
              date_check_id: upload.date_check_id,
              created_at: upload._max.created_at,
            },
          ]
        : [],
    );
    const latestImages = latestUploadFilters.length
      ? await client.productionOrderDateCheckImages.findMany({
          where: { OR: latestUploadFilters },
          select: {
            date_check_id: true,
            created_at: true,
            createdBy: {
              select: { id: true, name: true, username: true, email: true },
            },
          },
          // If upload timestamps match, the image with the highest id wins.
          orderBy: { id: 'desc' },
          distinct: ['date_check_id'],
        })
      : [];
    const latestImageByCheck = new Map(
      latestImages.map((image) => [image.date_check_id, image]),
    );

    return checks.map((check) => ({
      ...check,
      last_image_uploaded_at:
        latestImageByCheck.get(check.id)?.created_at ?? null,
      last_image_uploaded_by:
        latestImageByCheck.get(check.id)?.createdBy ?? null,
    }));
  }

  async findById(checkId: number) {
    const dateCheck =
      await this.prismaService.productionOrderDateChecks.findUnique({
        where: {
          id: checkId,
        },
        include: productionOrderDateCheckInclude,
      });

    if (!dateCheck) {
      throw new NotFoundException('Date check not found');
    }

    return dateCheck;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderDateChecks.findMany({
      where: {
        production_order_id: productionOrderId,
      },
      include: productionOrderDateCheckInclude,
      orderBy: [
        {
          checked_at: 'desc',
        },
        {
          created_at: 'desc',
        },
        {
          id: 'desc',
        },
      ],
    });
  }

  async findImageFile(filename: string, original = false) {
    const imagePaths = getDateCheckImageLookupPaths(filename);

    if (imagePaths.length === 0) {
      return null;
    }

    const image =
      await this.prismaService.productionOrderDateCheckImages.findFirst({
        where: {
          image_path: {
            in: imagePaths,
          },
        },
        select: {
          id: true,
        },
      });

    if (!image) {
      return null;
    }

    return resolveDateCheckImageFile(filename, original);
  }

  async findRequestFile(filename: string) {
    const requestFilePaths = getDateCheckRequestFileLookupPaths(filename);

    if (requestFilePaths.length === 0) {
      return null;
    }

    const dateCheck =
      await this.prismaService.productionOrderDateChecks.findFirst({
        where: {
          request_file_path: {
            in: requestFilePaths,
          },
        },
        select: {
          id: true,
        },
      });

    if (!dateCheck) {
      return null;
    }

    return resolveDateCheckRequestFile(filename);
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderDateCheckDto,
    user: AuthenticatedUser | undefined,
    files: {
      requestFilePath?: string;
    } = {},
  ) {
    if (!files.requestFilePath?.trim()) {
      throw new BadRequestException('Vui lòng đính kèm file yêu cầu in date.');
    }

    await this.ensureProductionOrderExists(productionOrderId);

    const userId = this.normalizeUserId(user);

    const createdDateCheck =
      await this.prismaService.productionOrderDateChecks.create({
        data: {
          production_order_id: productionOrderId,
          package_type: this.normalizeRequiredString(
            dto?.package_type,
            'package_type',
          ),
          request_file_path: files.requestFilePath,
          approval_status: DATE_CHECK_APPROVAL_STATUS.pending,
          created_by_id: userId,
        },
        include: productionOrderDateCheckInclude,
      });

    if (!createdDateCheck) {
      throw new NotFoundException('Date check not found');
    }

    return createdDateCheck;
  }

  async update(
    checkId: number,
    dto: UpdateProductionOrderDateCheckDto,
    files: {
      requestFilePath?: string;
    } = {},
  ) {
    const existingDateCheck = await this.findById(checkId);
    this.ensurePending(existingDateCheck.approval_status);

    const data: Prisma.ProductionOrderDateChecksUncheckedUpdateInput = {};

    if (dto.package_type !== undefined) {
      data.package_type = this.normalizeRequiredString(
        dto.package_type,
        'package_type',
      );
    }

    if (files.requestFilePath !== undefined) {
      data.request_file_path = files.requestFilePath;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No update data provided');
    }

    const updatedDateCheck =
      await this.prismaService.productionOrderDateChecks.update({
        where: {
          id: checkId,
        },
        data,
        include: productionOrderDateCheckInclude,
      });

    if (
      files.requestFilePath !== undefined &&
      files.requestFilePath !== existingDateCheck.request_file_path
    ) {
      await removeStoredDateCheckRequestFile(
        existingDateCheck.request_file_path,
      );
    }

    return updatedDateCheck;
  }

  async approve(
    checkId: number,
    dto: ApproveProductionOrderDateCheckDto,
    user?: AuthenticatedUser,
  ) {
    const existingDateCheck = await this.findById(checkId);
    this.ensurePending(existingDateCheck.approval_status);

    const approvalStatus = this.normalizeApprovalStatus(dto?.approval_status);

    return this.prismaService.productionOrderDateChecks.update({
      where: {
        id: checkId,
      },
      data: {
        approval_status: approvalStatus,
        approved_by_id: this.normalizeUserId(user),
        approved_at: new Date(),
      },
      include: productionOrderDateCheckInclude,
    });
  }

  async delete(checkId: number) {
    const existingDateCheck = await this.findById(checkId);
    this.ensurePending(existingDateCheck.approval_status);

    const imagePaths = existingDateCheck.images.map(
      (image) => image.image_path,
    );

    await this.prismaService.productionOrderDateChecks.delete({
      where: {
        id: checkId,
      },
    });

    await Promise.all([
      removeStoredDateCheckRequestFile(existingDateCheck.request_file_path),
      removeStoredDateCheckImages(imagePaths),
    ]);

    return existingDateCheck;
  }

  async addImages(
    checkId: number,
    imagePaths: string[],
    user?: AuthenticatedUser,
  ) {
    if (imagePaths.length === 0) {
      throw new BadRequestException('images are required');
    }

    const existingDateCheck = await this.findById(checkId);
    this.ensurePending(existingDateCheck.approval_status);

    const userId = this.normalizeUserId(user);

    await this.prismaService.productionOrderDateCheckImages.createMany({
      data: imagePaths.map((imagePath) => ({
        date_check_id: checkId,
        image_path: imagePath,
        created_by_id: userId,
      })),
    });

    return this.findById(checkId);
  }

  async deleteImage(imageId: number) {
    const image =
      await this.prismaService.productionOrderDateCheckImages.findUnique({
        where: {
          id: imageId,
        },
        include: {
          dateCheck: {
            select: {
              approval_status: true,
            },
          },
        },
      });

    if (!image) {
      throw new NotFoundException('Date check image not found');
    }

    this.ensurePending(image.dateCheck.approval_status);

    await this.prismaService.productionOrderDateCheckImages.delete({
      where: {
        id: imageId,
      },
    });

    await removeStoredDateCheckImage(image.image_path);

    return image;
  }

  private ensurePending(approvalStatus: string) {
    if (approvalStatus !== DATE_CHECK_APPROVAL_STATUS.pending) {
      throw new BadRequestException(
        'Date check is already approved or rejected',
      );
    }
  }

  private async ensureProductionOrderExists(productionOrderId: number) {
    const productionOrder =
      await this.prismaService.productionOrders.findUnique({
        where: {
          id: productionOrderId,
        },
        select: {
          id: true,
        },
      });

    if (!productionOrder) {
      throw new NotFoundException('Production order not found');
    }
  }

  private normalizeRequiredString(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return value.trim();
  }

  private normalizeApprovalStatus(value: unknown) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException('approval_status is required');
    }

    const normalizedValue = value.trim().toLowerCase();

    if (
      normalizedValue !== DATE_CHECK_APPROVAL_STATUS.approved &&
      normalizedValue !== DATE_CHECK_APPROVAL_STATUS.rejected
    ) {
      throw new BadRequestException(
        'approval_status must be approved or rejected',
      );
    }

    return normalizedValue;
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
