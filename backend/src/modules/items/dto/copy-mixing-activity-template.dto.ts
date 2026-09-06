import { CreateMixingActivityTemplateDto } from './create-mixing-activity-template.dto';

export class CopyMixingActivityTemplateDto extends CreateMixingActivityTemplateDto {
  source_template_id: number | string;
}
