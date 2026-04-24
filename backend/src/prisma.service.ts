import { Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

const softDeleteDelegates = {
  Users: 'users',
  Roles: 'roles',
  Departments: 'departments',
  Company: 'company',
} as const;

type SoftDeleteModel = keyof typeof softDeleteDelegates;

function isSoftDeleteModel(model?: string): model is SoftDeleteModel {
  return !!model && model in softDeleteDelegates;
}

type PrismaArgsWithWhere = {
  where?: Record<string, unknown>;
};

function withNotDeleted<T>(args: T): T & PrismaArgsWithWhere {
  const typedArgs = (args ?? {}) as PrismaArgsWithWhere;
  const where = typedArgs.where ?? {};

  if ('deleted_at' in where) {
    return args as T & PrismaArgsWithWhere;
  }

  return {
    ...(args as object),
    where: {
      ...where,
      deleted_at: null,
    },
  } as T & PrismaArgsWithWhere;
}

const softDeleteExtension = Prisma.defineExtension((client) =>
  client.$extends({
    name: 'soft-delete',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!isSoftDeleteModel(model)) {
            return query(args);
          }

          if (
            operation === 'findMany' ||
            operation === 'findFirst' ||
            operation === 'findFirstOrThrow' ||
            operation === 'findUnique' ||
            operation === 'findUniqueOrThrow' ||
            operation === 'count' ||
            operation === 'aggregate' ||
            operation === 'update' ||
            operation === 'updateMany'
          ) {
            return query(withNotDeleted(args));
          }

          if (operation === 'delete') {
            const delegate = softDeleteDelegates[model];
            const modelClient = client[delegate] as any;

            return modelClient.update({
              ...args,
              where: withNotDeleted(args).where,
              data: {
                deleted_at: new Date(),
              },
            });
          }

          if (operation === 'deleteMany') {
            const delegate = softDeleteDelegates[model];
            const modelClient = client[delegate] as any;

            return modelClient.updateMany({
              ...args,
              where: withNotDeleted(args).where,
              data: {
                deleted_at: new Date(),
              },
            });
          }

          return query(args);
        },
      },
    },
  }),
);

const ExtendedPrismaClient = class extends PrismaClient {
  constructor() {
    super();
    return this.$extends(softDeleteExtension) as any;
  }
};

@Injectable()
export class PrismaService
  extends ExtendedPrismaClient
  implements OnModuleInit
{
  async onModuleInit() {
    await this.$connect();
  }
}
