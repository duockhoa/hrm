import { PartialType } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-copanies.dto';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}
