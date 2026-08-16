import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { stat, unlink } from 'fs/promises';
import { diskStorage } from 'multer';
import { basename, extname, join, resolve, sep } from 'path';

export const PRODUCTION_ORDER_PRODUCTION_GUIDE_ROUTE =
  '/production-orders/production-guides';

const PRODUCTION_ORDER_PRODUCTION_GUIDE_UPLOAD_DIR = join(
  process.cwd(),
  'uploads',
  'production-order-production-guides',
);

const MAX_PRODUCTION_GUIDE_FILE_SIZE_IN_BYTES = 20 * 1024 * 1024;

const MIME_TYPES_BY_EXTENSION = new Map([
  ['.pdf', 'application/pdf'],
  ['.doc', 'application/msword'],
  [
    '.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  ['.xls', 'application/vnd.ms-excel'],
  [
    '.xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  ['.txt', 'text/plain'],
  ['.csv', 'text/csv'],
]);

const normalizeOriginalFilename = (originalName: string) => {
  const utf8Filename = Buffer.from(originalName, 'latin1').toString('utf8');
  return utf8Filename.includes('\uFFFD') ? originalName : utf8Filename;
};

const getSafeFilename = (filename: string) => {
  const normalizedFilename = filename.trim();

  if (
    normalizedFilename === '' ||
    normalizedFilename === '.' ||
    normalizedFilename === '..' ||
    normalizedFilename.includes('/') ||
    normalizedFilename.includes('\\') ||
    basename(normalizedFilename) !== normalizedFilename
  ) {
    return null;
  }

  return normalizedFilename;
};

const getResolvedFilePath = (filename: string) => {
  const safeFilename = getSafeFilename(filename);

  if (!safeFilename) {
    return null;
  }

  const resolvedUploadDir = resolve(
    PRODUCTION_ORDER_PRODUCTION_GUIDE_UPLOAD_DIR,
  );
  const filePath = resolve(resolvedUploadDir, safeFilename);

  return filePath.startsWith(`${resolvedUploadDir}${sep}`) ? filePath : null;
};

const getStoredFilename = (filePath?: string | null) => {
  if (!filePath?.startsWith(`${PRODUCTION_ORDER_PRODUCTION_GUIDE_ROUTE}/`)) {
    return null;
  }

  return getSafeFilename(basename(filePath));
};

export const productionOrderProductionGuideUploadOptions = {
  storage: diskStorage({
    destination: (_req, _file, callback) => {
      mkdirSync(PRODUCTION_ORDER_PRODUCTION_GUIDE_UPLOAD_DIR, {
        recursive: true,
      });
      callback(null, PRODUCTION_ORDER_PRODUCTION_GUIDE_UPLOAD_DIR);
    },
    filename: (_req, file, callback) => {
      const extension = extname(
        normalizeOriginalFilename(file.originalname),
      ).toLowerCase();
      callback(null, `${randomUUID()}${extension}`);
    },
  }),
  fileFilter: (_req, file, callback) => {
    const extension = extname(
      normalizeOriginalFilename(file.originalname),
    ).toLowerCase();

    if (!MIME_TYPES_BY_EXTENSION.has(extension)) {
      callback(
        new BadRequestException('file must be PDF, Word, Excel, TXT, or CSV'),
        false,
      );
      return;
    }

    callback(null, true);
  },
  limits: {
    fileSize: MAX_PRODUCTION_GUIDE_FILE_SIZE_IN_BYTES,
  },
};

export const getProductionGuidePath = (file: Express.Multer.File) =>
  `${PRODUCTION_ORDER_PRODUCTION_GUIDE_ROUTE}/${file.filename}`;

export const getProductionGuideOriginalFilename = (file: Express.Multer.File) =>
  normalizeOriginalFilename(file.originalname).slice(0, 255);

export const getProductionGuideMimeType = (file: Express.Multer.File) => {
  const extension = extname(
    normalizeOriginalFilename(file.originalname),
  ).toLowerCase();
  return MIME_TYPES_BY_EXTENSION.get(extension) ?? file.mimetype;
};

export const resolveProductionGuideFile = async (filePath?: string | null) => {
  const filename = getStoredFilename(filePath);
  const resolvedFilePath = filename ? getResolvedFilePath(filename) : null;

  if (!filename || !resolvedFilePath) {
    return null;
  }

  const fileStat = await stat(resolvedFilePath).catch(() => null);

  if (!fileStat?.isFile()) {
    return null;
  }

  return {
    filePath: resolvedFilePath,
    size: fileStat.size,
  };
};

export const removeUploadedProductionGuide = async (
  file?: Express.Multer.File,
) => {
  if (file?.path) {
    await unlink(file.path).catch(() => undefined);
  }
};

export const removeStoredProductionGuide = async (filePath?: string | null) => {
  const filename = getStoredFilename(filePath);
  const resolvedFilePath = filename ? getResolvedFilePath(filename) : null;

  if (resolvedFilePath) {
    await unlink(resolvedFilePath).catch(() => undefined);
  }
};
