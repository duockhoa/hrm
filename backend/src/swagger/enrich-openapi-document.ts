import type { OpenAPIObject } from '@nestjs/swagger';

const HTTP_METHODS = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
] as const;

const SUMMARY_PREFIXES: Array<[string, string]> = [
  ['findAll', 'Lấy danh sách'],
  ['find', 'Lấy thông tin'],
  ['get', 'Lấy thông tin'],
  ['create', 'Tạo mới'],
  ['add', 'Thêm'],
  ['update', 'Cập nhật'],
  ['patch', 'Cập nhật'],
  ['sync', 'Đồng bộ'],
  ['remove', 'Xóa'],
  ['delete', 'Xóa'],
  ['export', 'Xuất'],
  ['upload', 'Tải lên'],
  ['approve', 'Phê duyệt'],
  ['issue', 'Cấp phát'],
  ['receive', 'Ghi nhận'],
];

const MULTIPART_FIELDS_BY_OPERATION_ID: Record<string, string[]> = {
  ProductionOrderDeviationsController_create: [
    'deviation_images',
    'deviation_image',
  ],
  ProductionOrderDeviationsController_update: [
    'deviation_images',
    'deviation_image',
  ],
  ProductionOrdersController_updatePostHomogenizationGranuleCheck: [
    'granule_image',
    'image',
  ],
  ProductionOrdersController_createPostHomogenizationGranuleCheck: [
    'granule_image',
    'image',
  ],
  ProductionOrdersController_updatePostPreparationSolutionCheck: [
    'final_volume_image',
    'solution_image',
  ],
  ProductionOrdersController_createPostPreparationSolutionCheck: [
    'final_volume_image',
    'solution_image',
  ],
  ProductionOrdersController_updateMaterialProcessSummary: ['image'],
  ProductionOrdersController_createMaterialProcessSummary: ['image'],
  ProductionOrdersController_updateSensoryCheck: ['sensory_image', 'image'],
  ProductionOrdersController_createSensoryCheck: ['sensory_image', 'image'],
  ProductionOrdersController_updateSteamSterilizationCheck: [
    'configuration_image',
    'indicator_image',
    'reached_temperature_image',
  ],
  ProductionOrdersController_createSteamSterilizationCheck: [
    'configuration_image',
    'indicator_image',
    'reached_temperature_image',
  ],
  ProductionOrdersController_updateDateCheck: ['request_file'],
  ProductionOrdersController_createDateCheck: ['request_file'],
  ProductionOrdersController_addDateCheckImages: ['images', 'image'],
};

export function enrichOpenApiDocument(document: OpenAPIObject) {
  for (const [path, pathItem] of Object.entries(document.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];

      if (!operation) {
        continue;
      }

      operation.summary ??= createSummary(operation.operationId, path);
      operation.description ??= `Thực hiện thao tác qua ${method.toUpperCase()} ${path}.`;
      operation.responses ??= {};

      const successStatus = method === 'post' ? '201' : '200';
      operation.responses[successStatus] ??= {
        description: 'Thao tác thành công',
      };

      for (const [statusCode, response] of Object.entries(
        operation.responses,
      )) {
        if (isRecord(response) && !('$ref' in response)) {
          response.description ||= getResponseDescription(statusCode);
        }
      }

      if (path !== '/' && !path.startsWith('/auth/')) {
        operation.responses['401'] ??= {
          description: 'Chưa xác thực hoặc access token không hợp lệ',
        };
      }

      if (path.includes('{')) {
        operation.responses['404'] ??= {
          description: 'Không tìm thấy tài nguyên theo tham số trên URL',
        };
      }

      operation.parameters?.forEach((parameter) => {
        if ('$ref' in parameter || parameter.description) {
          return;
        }

        parameter.description = `Giá trị ${parameter.in} cho ${parameter.name}`;
      });

      if (path === '/' || path.startsWith('/auth/')) {
        operation.security = [];
      }

      const multipartFields =
        MULTIPART_FIELDS_BY_OPERATION_ID[operation.operationId ?? ''];
      if (multipartFields) {
        addMultipartRequestBody(operation, multipartFields);
      }
    }
  }

  enrichSchemas(document);

  return document;
}

function addMultipartRequestBody(operation: any, fileFields: string[]) {
  const jsonSchema =
    operation.requestBody?.content?.['application/json']?.schema;
  const fileProperties = Object.fromEntries(
    fileFields.map((fieldName) => [
      fieldName,
      {
        type: 'array',
        items: { type: 'string', format: 'binary' },
        description: `File tải lên qua trường ${fieldName}.`,
      },
    ]),
  );
  const uploadSchema = {
    type: 'object',
    properties: fileProperties,
  };

  operation.requestBody ??= { required: false, content: {} };
  operation.requestBody.content ??= {};
  operation.requestBody.content['multipart/form-data'] = {
    schema: jsonSchema ? { allOf: [jsonSchema, uploadSchema] } : uploadSchema,
  };
}

function enrichSchemas(document: OpenAPIObject) {
  for (const schema of Object.values(document.components?.schemas ?? {})) {
    const schemaRecord = schema as Record<string, unknown>;

    if (!isRecord(schemaRecord.properties)) {
      continue;
    }

    for (const [propertyName, property] of Object.entries(
      schemaRecord.properties,
    )) {
      if (!isRecord(property)) {
        continue;
      }

      property.description ??= `Giá trị của trường ${propertyName}.`;
      normalizeUnionProperty(propertyName, property);
    }
  }
}

function normalizeUnionProperty(
  propertyName: string,
  property: Record<string, any>,
) {
  if (property.type !== 'object') {
    return;
  }

  delete property.type;
  property.nullable = true;

  if (/(date|_at$|time)/i.test(propertyName)) {
    property.type = 'string';
    property.format = 'date-time';
    return;
  }

  property.oneOf = [
    { type: 'number' },
    { type: 'string' },
    ...(propertyName.includes('result') ? [{ type: 'boolean' }] : []),
  ];
}

function createSummary(operationId: string | undefined, path: string) {
  const actionName = operationId?.replace(/^.+?Controller_/, '') ?? '';
  const normalizedActionName = actionName.replace(/([a-z])([A-Z])/g, '$1 $2');
  const pathSubject = getPathSubject(path);

  for (const [prefix, translation] of SUMMARY_PREFIXES) {
    if (actionName.startsWith(prefix)) {
      const subject = normalizedActionName
        .slice(prefix.length)
        .trim()
        .replace(/^by id$/i, '');
      return subject
        ? `${translation} ${toSentenceCase(subject)}`
        : `${translation} ${pathSubject}`;
    }
  }

  return `Thao tác với ${pathSubject}`;
}

function getPathSubject(path: string) {
  const staticSegments = path
    .split('/')
    .filter((segment) => segment && !segment.startsWith('{'));
  const subject = staticSegments.at(-1) ?? 'tài nguyên';

  return toSentenceCase(subject);
}

function getResponseDescription(statusCode: string) {
  const descriptions: Record<string, string> = {
    '200': 'Lấy hoặc cập nhật dữ liệu thành công',
    '201': 'Tạo hoặc thực hiện thao tác thành công',
    '400': 'Dữ liệu gửi lên không hợp lệ',
    '401': 'Chưa xác thực hoặc access token không hợp lệ',
    '403': 'Không có quyền thực hiện thao tác',
    '404': 'Không tìm thấy tài nguyên',
  };

  return descriptions[statusCode] ?? 'Phản hồi từ hệ thống';
}

function toSentenceCase(value: string) {
  return value
    .replace(/[{}]/g, '')
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}
