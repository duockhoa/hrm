import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, Min } from 'class-validator';

export class AddUserRolesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roleId?: number;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  roleIds?: number[];
}

export class SyncUserRolesDto {
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  roleIds!: number[];
}
