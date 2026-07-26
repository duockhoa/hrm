import { IsArray, IsInt } from 'class-validator';

export class SyncUserApplicationsDto {
  @IsArray()
  @IsInt({ each: true })
  applicationIds!: number[];
}
