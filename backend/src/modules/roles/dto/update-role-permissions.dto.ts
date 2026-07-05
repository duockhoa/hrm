import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, Min } from 'class-validator';

export class AddRolePermissionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  permissionId?: number;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  permissionIds?: number[];
}

export class SyncRolePermissionsDto {
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  permissionIds!: number[];
}
