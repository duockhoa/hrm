import {} from 'class-validator';

export class CreateDepartmentDto {
  name: string;
  description?: string;
  team_lead?: number;
}
