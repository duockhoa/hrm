import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateEquipmentIncidentReportDto } from './dto/create-equipment-incident-report.dto';
import { UpdateEquipmentIncidentReportDto } from './dto/update-equipment-incident-report.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const INCIDENT_TITLE_MAX_LENGTH = 255;
const INCIDENT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const INCIDENT_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
] as const;

const incidentReportUserSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const incidentReportInclude = {
  equipment: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  createdBy: {
    select: incidentReportUserSelect,
  },
} satisfies Prisma.EquipmentIncidentReportsInclude;

@Injectable()
export class EquipmentIncidentReportsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(query: {
    equipment_id?: unknown;
    status?: unknown;
    priority?: unknown;
  }) {
    const equipmentId = this.normalizeOptionalPositiveInt(
      query?.equipment_id,
      'equipment_id',
    );
    const status = this.normalizeOptionalEnum(
      query?.status,
      'status',
      INCIDENT_STATUSES,
    );
    const priority = this.normalizeOptionalEnum(
      query?.priority,
      'priority',
      INCIDENT_PRIORITIES,
    );

    return this.prismaService.equipmentIncidentReports.findMany({
      where: {
        ...(equipmentId ? { equipment_id: equipmentId } : {}),
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
      },
      include: incidentReportInclude,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
  }

  async findById(id: number) {
    const report = await this.prismaService.equipmentIncidentReports.findUnique(
      {
        where: { id },
        include: incidentReportInclude,
      },
    );

    if (!report) {
      throw new NotFoundException('Equipment incident report not found');
    }

    return report;
  }

  async create(
    dto: CreateEquipmentIncidentReportDto,
    user?: AuthenticatedUser,
  ) {
    const data = this.buildCreateData(dto, user);
    await this.ensureEquipmentExists(data.equipment_id);

    return this.prismaService.equipmentIncidentReports.create({
      data,
      include: incidentReportInclude,
    });
  }

  async update(id: number, dto: UpdateEquipmentIncidentReportDto) {
    await this.findById(id);
    const data = this.buildUpdateData(dto);

    return this.prismaService.equipmentIncidentReports.update({
      where: { id },
      data,
      include: incidentReportInclude,
    });
  }

  private buildCreateData(
    dto: CreateEquipmentIncidentReportDto,
    user?: AuthenticatedUser,
  ): Prisma.EquipmentIncidentReportsUncheckedCreateInput {
    return {
      equipment_id: this.normalizeRequiredPositiveInt(
        dto?.equipment_id,
        'equipment_id',
      ),
      title: this.normalizeRequiredString(
        dto?.title,
        'title',
        INCIDENT_TITLE_MAX_LENGTH,
      ),
      description: this.normalizeRequiredString(
        dto?.description,
        'description',
      ),
      priority: this.normalizeEnum(
        dto?.priority,
        'priority',
        INCIDENT_PRIORITIES,
        'MEDIUM',
      ),
      status: this.normalizeEnum(
        dto?.status,
        'status',
        INCIDENT_STATUSES,
        'OPEN',
      ),
      created_by_id: this.normalizeUserId(user),
    };
  }

  private buildUpdateData(dto: UpdateEquipmentIncidentReportDto) {
    const updateDto = dto ?? {};
    const data: Prisma.EquipmentIncidentReportsUncheckedUpdateInput = {};

    if ('title' in updateDto) {
      data.title = this.normalizeRequiredString(
        updateDto.title,
        'title',
        INCIDENT_TITLE_MAX_LENGTH,
      );
    }

    if ('description' in updateDto) {
      data.description = this.normalizeRequiredString(
        updateDto.description,
        'description',
      );
    }

    if ('priority' in updateDto) {
      data.priority = this.normalizeEnum(
        updateDto.priority,
        'priority',
        INCIDENT_PRIORITIES,
      );
    }

    if ('status' in updateDto) {
      data.status = this.normalizeEnum(
        updateDto.status,
        'status',
        INCIDENT_STATUSES,
      );
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    return data;
  }

  private async ensureEquipmentExists(equipmentId: number) {
    const equipment = await this.prismaService.equipment.findUnique({
      where: { id: equipmentId },
      select: { id: true },
    });

    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }
  }

  private normalizeRequiredPositiveInt(value: unknown, fieldName: string) {
    const normalizedValue = Number(value);

    if (!Number.isInteger(normalizedValue) || normalizedValue <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    return normalizedValue;
  }

  private normalizeOptionalPositiveInt(value: unknown, fieldName: string) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    return this.normalizeRequiredPositiveInt(value, fieldName);
  }

  private normalizeRequiredString(
    value: unknown,
    fieldName: string,
    maxLength?: number,
  ) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const normalizedValue = value.trim();

    if (maxLength && normalizedValue.length > maxLength) {
      throw new BadRequestException(
        `${fieldName} must be at most ${maxLength} characters`,
      );
    }

    return normalizedValue;
  }

  private normalizeEnum<T extends readonly string[]>(
    value: unknown,
    fieldName: string,
    allowedValues: T,
    defaultValue?: T[number],
  ): T[number] {
    if (value === undefined || value === null || value === '') {
      if (defaultValue) {
        return defaultValue;
      }

      throw new BadRequestException(`${fieldName} is required`);
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} is invalid`);
    }

    const normalizedValue = value.trim().toUpperCase();

    if (!allowedValues.includes(normalizedValue)) {
      throw new BadRequestException(`${fieldName} is invalid`);
    }

    return normalizedValue as T[number];
  }

  private normalizeOptionalEnum<T extends readonly string[]>(
    value: unknown,
    fieldName: string,
    allowedValues: T,
  ): T[number] | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    return this.normalizeEnum(value, fieldName, allowedValues);
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
