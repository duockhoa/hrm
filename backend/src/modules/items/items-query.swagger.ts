import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { ITEM_EXPAND_FIELDS, ITEM_SELECT_FIELDS } from './dto/list-items-query';

export function ApiItemsQuery() {
  return applyDecorators(
    ApiQuery({
      name: 'skip',
      required: false,
      schema: { type: 'integer', minimum: 0 },
      description: 'Offset. Supplying skip without top defaults to 50 items.',
    }),
    ApiQuery({
      name: 'top',
      required: false,
      schema: { type: 'integer', minimum: 1, maximum: 200 },
      description:
        'Page size. No pagination when both skip and top are omitted.',
    }),
    ApiQuery({
      name: 'search',
      required: false,
      type: String,
      description:
        'Contains search across item_code, item_name and dk_code; maximum 200 characters.',
    }),
    ApiQuery({
      name: 'codePrefix',
      required: false,
      type: String,
      example: 'TP',
      description: 'Alphabetical item code prefix, normalized to uppercase.',
    }),
    ApiQuery({
      name: 'series',
      required: false,
      type: String,
      example: '108,109',
      description:
        'Up to 100 comma-separated Series IDs. Other filters are combined with AND.',
    }),
    ApiQuery({
      name: 'registrationId',
      required: false,
      schema: { type: 'integer', minimum: 1 },
    }),
    ApiQuery({
      name: 'hasRegistration',
      required: false,
      schema: { type: 'boolean' },
    }),
    ApiQuery({
      name: 'select',
      required: false,
      type: String,
      example: 'item_code,item_name,series',
      description: `Comma-separated scalar fields: ${ITEM_SELECT_FIELDS.join(', ')}. When select is supplied, relations are omitted unless requested with expand.`,
    }),
    ApiQuery({
      name: 'orderBy',
      required: false,
      type: String,
      example: 'item_name:asc',
      description: `Comma-separated field:asc or field:desc. Fields: ${ITEM_SELECT_FIELDS.join(', ')}. item_code:asc is appended if absent.`,
    }),
    ApiQuery({
      name: 'count',
      required: false,
      schema: { type: 'boolean', default: false },
      description:
        'Return filtered total, before pagination, in X-Total-Count.',
    }),
    ApiQuery({
      name: 'expand',
      required: false,
      type: String,
      example: 'registration',
      description: `Comma-separated relations: ${ITEM_EXPAND_FIELDS.join(', ')}. Use none for no relations. Without select or expand, existing default relations are retained.`,
    }),
    ApiOkResponse({
      description:
        'Array of items. X-Total-Count is present only when count=true.',
      headers: {
        'X-Total-Count': {
          description: 'Filtered total before pagination',
          schema: { type: 'integer' },
        },
      },
      schema: {
        type: 'array',
        items: { type: 'object', additionalProperties: true },
      },
    }),
  );
}
