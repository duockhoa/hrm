import { IsString, IsEmail, IsNotEmpty } from 'class-validator';
export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  name: string;
  @IsString()
  description?: string;
  @IsString()
  address?: string;
  @IsString()
  phone?: string;
  @IsEmail()
  email?: string;
}
