import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateRoleDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2147483647)
  production_order_read_limit?: number | null;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  roleName?: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}
