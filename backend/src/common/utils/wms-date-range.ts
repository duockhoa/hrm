import { BadRequestException } from '@nestjs/common';
export function wmsDateRange(from?: string, to?: string) {
  if (from && to && from > to)
    throw new BadRequestException(
      'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.',
    );
  return {
    ...(from ? { gte: new Date(`${from}T00:00:00+07:00`) } : {}),
    ...(to
      ? { lt: new Date(new Date(`${to}T00:00:00+07:00`).getTime() + 86400000) }
      : {}),
  };
}
