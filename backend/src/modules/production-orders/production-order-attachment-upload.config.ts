import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { basename, extname, join, resolve, sep } from 'path';
import {
  removeImageAndThumbnail,
  resolvePreferredImageFile,
  thumbnailDiskStorage,
} from '../../common/utils/image-thumbnail.util';

const PRODUCTION_ORDER_ATTACHMENT_UPLOAD_DIR = join(
  process.cwd(),
  'uploads',
  'production-order-attachments',
);

export const PRODUCTION_ORDER_ATTACHMENT_FILE_ROUTE =
  '/production-orders/attachments/files';
export const MAX_PRODUCTION_ORDER_ATTACHMENT_FILE_COUNT = 10;

const MAX_FILE_SIZE_IN_BYTES = 20 * 1024 * 1024;
const EXTENSIONS_BY_MIME_TYPE = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);

const ensureUploadDirectory = () => {
  mkdirSync(PRODUCTION_ORDER_ATTACHMENT_UPLOAD_DIR, { recursive: true });
};

const normalizeOriginalFilename = (originalName: string) => {
  const utf8Filename = Buffer.from(originalName, 'latin1').toString('utf8');

  return utf8Filename.includes('\uFFFD') ? originalName : utf8Filename;
};

const getStoredFilename = (file: Express.Multer.File) => {
  const normalizedFilename = basename(
    normalizeOriginalFilename(file.originalname).replace(/\\/g, '/'),
  );
  const extension =
    EXTENSIONS_BY_MIME_TYPE.get(file.mimetype) ??
    extname(normalizedFilename).toLowerCase();
  const originalBaseName = extension
    ? normalizedFilename.slice(0, -extname(normalizedFilename).length)
    : normalizedFilename;
  const safeBaseName = originalBaseName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 120);

  return `${safeBaseName || 'image'}-${randomUUID()}${extension}`;
};

export const productionOrderAttachmentUploadOptions = {
  storage: thumbnailDiskStorage({
    destination: (_request, _file, callback) => {
      ensureUploadDirectory();
      callback(null, PRODUCTION_ORDER_ATTACHMENT_UPLOAD_DIR);
    },
    filename: (_request, file, callback) => {
      callback(null, getStoredFilename(file));
    },
  }),
  fileFilter: (_request, file, callback) => {
    if (!EXTENSIONS_BY_MIME_TYPE.has(file.mimetype)) {
      callback(
        new BadRequestException('files must be JPG, PNG, WEBP, or GIF images'),
        false,
      );
      return;
    }

    callback(null, true);
  },
  limits: {
    fileSize: MAX_FILE_SIZE_IN_BYTES,
  },
};

export const getProductionOrderAttachmentFilePath = (
  file: Express.Multer.File,
) => `${PRODUCTION_ORDER_ATTACHMENT_FILE_ROUTE}/${file.filename}`;

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

const getStoredFilenameFromPath = (filePath: string) => {
  if (!filePath.startsWith(`${PRODUCTION_ORDER_ATTACHMENT_FILE_ROUTE}/`)) {
    return null;
  }

  return getSafeFilename(basename(filePath));
};

const getResolvedFilePath = (filename: string) => {
  const safeFilename = getSafeFilename(filename);

  if (!safeFilename) {
    return null;
  }

  const uploadDirectory = resolve(PRODUCTION_ORDER_ATTACHMENT_UPLOAD_DIR);
  const filePath = resolve(uploadDirectory, safeFilename);

  return filePath.startsWith(`${uploadDirectory}${sep}`) ? filePath : null;
};

export const resolveProductionOrderAttachmentFile = async (
  filename: string,
  contentType: string,
  original = false,
) => {
  const filePath = getResolvedFilePath(filename);

  if (!filePath) {
    return null;
  }

  return resolvePreferredImageFile(filePath, contentType, {
    preferThumbnail: !original,
  });
};

export const removeStoredProductionOrderAttachmentFile = async (
  filePath: string | null | undefined,
) => {
  if (!filePath) {
    return;
  }

  const filename = getStoredFilenameFromPath(filePath);
  const resolvedFilePath = filename ? getResolvedFilePath(filename) : null;

  if (!resolvedFilePath) {
    return;
  }

  await removeImageAndThumbnail(resolvedFilePath);
};

export const removeUploadedProductionOrderAttachmentFiles = async (
  files: Express.Multer.File[] | undefined,
) => {
  await Promise.all(
    (files ?? []).map((file) =>
      removeStoredProductionOrderAttachmentFile(
        getProductionOrderAttachmentFilePath(file),
      ),
    ),
  );
};
