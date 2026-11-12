import { Prisma } from '@prisma/client';

export type SapItemSeries = Prisma.InputJsonObject & {
  Series: number;
  Document: string;
  Name: string;
  Prefix?: string | null;
  Suffix?: string | null;
  IsManual?: string | null;
  Locked?: string | null;
};
