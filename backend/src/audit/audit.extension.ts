import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { auditContext } from './audit-context';

const logger = new Logger('AuditLog');
const excludedModels = new Set([
  'AuditLogs',
  'Tokens',
  'PasswordResetOTPs',
  'UserLoginSessions',
  'Notifications',
]);
const sensitiveField = /password|token|secret|otp|hash|session_key|api_key/i;
const models = new Map(
  Prisma.dmmf.datamodel.models.map((model) => [model.name, model]),
);

type RecordData = Record<string, unknown>;

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value, (_key, item: unknown) =>
      typeof item === 'bigint' ? item.toString() : item,
    ),
  ) as Prisma.InputJsonValue;
}

function snapshot(modelName: string, value: unknown): RecordData | null {
  if (!value || typeof value !== 'object') return null;
  const model = models.get(modelName);
  if (!model) return null;

  const source = value as RecordData;
  const data: RecordData = {};
  for (const field of model.fields) {
    if (
      field.kind === 'scalar' &&
      field.name in source &&
      !sensitiveField.test(field.name) &&
      field.type !== 'Bytes'
    ) {
      data[field.name] = source[field.name];
    }
  }
  return toJson(data) as RecordData;
}

function changedValues(before: RecordData, after: RecordData) {
  const oldValues: RecordData = {};
  const newValues: RecordData = {};
  for (const [key, value] of Object.entries(after)) {
    if (key === 'created_at' || key === 'updated_at') continue;
    if (JSON.stringify(before[key]) !== JSON.stringify(value)) {
      oldValues[key] = before[key] ?? null;
      newValues[key] = value;
    }
  }
  return { oldValues, newValues };
}

function entityName(data: RecordData): string | undefined {
  const candidate = [
    'name',
    'item_name',
    'production_order_code',
    'filter_code',
    'code',
    'username',
  ]
    .map((key) => data[key])
    .find((value) => typeof value === 'string' && value.length > 0);
  return typeof candidate === 'string' ? candidate.slice(0, 255) : undefined;
}

export const auditExtension = Prisma.defineExtension((client) =>
  client.$extends({
    name: 'audit-log',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (
            !model ||
            excludedModels.has(model) ||
            !['create', 'update', 'upsert', 'delete'].includes(operation)
          ) {
            return query(args);
          }

          const modelMeta = models.get(model);
          const idField = modelMeta?.fields.find((field) => field.isId);
          if (!idField || !['Int', 'BigInt'].includes(idField.type)) {
            return query(args);
          }

          // The unextended delegate avoids another audit pass when reading snapshots.
          const delegateName = model[0].toLowerCase() + model.slice(1);
          const delegate = (client as any)[delegateName];
          const queryArgs = args as { where?: RecordData };
          let before: RecordData | null = null;
          if (operation !== 'create' && queryArgs.where) {
            try {
              before = snapshot(
                model,
                await delegate.findUnique({ where: queryArgs.where }),
              );
            } catch (error) {
              logger.error(
                `Could not read previous ${model} value: ${String(error)}`,
              );
            }
          }

          const result = await query(args);
          const resultId = (result as RecordData | null)?.[idField.name];
          const id = resultId ?? before?.[idField.name];
          if (typeof id !== 'number' && typeof id !== 'bigint') return result;

          try {
            const after =
              operation === 'delete' ? null : snapshot(model, result);
            const isCreate =
              operation === 'create' || (operation === 'upsert' && !before);
            const action =
              operation === 'delete'
                ? 'DELETE'
                : isCreate
                  ? 'CREATE'
                  : 'UPDATE';
            if (action !== 'DELETE' && !after) return result;

            let oldValues: RecordData | null = null;
            let newValues: RecordData | null = null;
            if (action === 'CREATE') newValues = after;
            if (action === 'DELETE')
              oldValues = before ?? snapshot(model, result);
            if (action === 'UPDATE' && before && after) {
              const changes = changedValues(before, after);
              if (!Object.keys(changes.newValues).length) return result;
              oldValues = changes.oldValues;
              newValues = changes.newValues;
            }
            if (action === 'UPDATE' && !before) newValues = after;

            const context = auditContext.getStore();
            const request = context?.request;
            const actorId = request?.user?.id;
            const actorName = request?.user?.name ?? request?.user?.username;
            const reason = request?.body?.reason;
            await client.auditLogs.create({
              data: {
                entity_type: (modelMeta?.dbName ?? model).slice(0, 100),
                entity_id: BigInt(id),
                entity_name: entityName(after ?? before ?? {}),
                action,
                old_values: oldValues
                  ? (oldValues as Prisma.InputJsonValue)
                  : Prisma.DbNull,
                new_values: newValues
                  ? (newValues as Prisma.InputJsonValue)
                  : Prisma.DbNull,
                actor_id:
                  typeof actorId === 'number' && Number.isInteger(actorId)
                    ? BigInt(actorId)
                    : undefined,
                actor_name: actorName?.slice(0, 255),
                reason: typeof reason === 'string' ? reason : undefined,
                request_id: context?.requestId,
                ip_address: request?.ip?.slice(0, 45),
                user_agent: request?.headers?.['user-agent'],
              },
            });
          } catch (error) {
            logger.error(
              `Could not record ${operation} on ${model}: ${String(error)}`,
            );
          }
          return result;
        },
      },
    },
  }),
);
