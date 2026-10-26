import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { basename, extname, join, resolve, sep } from 'path';
import {
  removeImageAndThumbnail,
  resolvePreferredImageFile,
  thumbnailDiskStorage,
} from '../../common/utils/image-thumbnail.util';

type WeighingRecordLotCheckUploadFileMetadata = Pick<
  Express.Multer.File,
  'mimetype' | 'originalname'
>;

export const PRODUCTION_ORDER_WEIGHING_RECORD_LOT_CHECK_IMAGE_ROUTE =
  '/production-orders/weighing-record-lot-checks/images';

const UPLOAD_DIR = join(
  process.cwd(),
  'uploads',
  'production-order-weighing-record-lot-checks',
  'images',
);

const IMAGE_EXTENSIONS_BY_MIME_TYPE = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);

const IMAGE_MIME_TYPES_BY_EXTENSION = new Map(
  Array.from(IMAGE_EXTENSIONS_BY_MIME_TYPE, ([mimeType, extension]) => [
    extension,
    mimeType,
  ]),
);
IMAGE_MIME_TYPES_BY_EXTENSION.set('.jpeg', 'image/jpeg');

const normalizeOriginalFilename = (originalName: string) => {
  const utf8Filename = Buffer.from(originalName, 'latin1').toString('utf8');
  return utf8Filename.includes('\uFFFD') ? originalName : utf8Filename;
};

const getStoredFilename = (file: WeighingRecordLotCheckUploadFileMetadata) => {
  const normalizedFilename = basename(
    normalizeOriginalFilename(file.originalname).replace(/\\/g, '/'),
  );
  const originalExtension = extname(normalizedFilename);
  const originalBaseName = originalExtension
    ? normalizedFilename.slice(0, -originalExtension.length)
    : normalizedFilename;
  const safeBaseName = originalBaseName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+/, '')
    .replace(/[.-]+$/, '')
    .slice(0, 120);
  const extension =
    IMAGE_EXTENSIONS_BY_MIME_TYPE.get(file.mimetype) ??
    extname(normalizeOriginalFilename(file.originalname)).toLowerCase();

  return `${safeBaseName || 'image'}-${randomUUID()}${extension}`;
};

export const productionOrderWeighingRecordLotCheckImageUploadOptions = {
  storage: thumbnailDiskStorage({
    destination: (_req, _file, callback) => {
      mkdirSync(UPLOAD_DIR, { recursive: true });
      callback(null, UPLOAD_DIR);
    },
    filename: (_req, file, callback) => callback(null, getStoredFilename(file)),
  }),
  fileFilter: (_req, file, callback) => {
    if (!IMAGE_EXTENSIONS_BY_MIME_TYPE.has(file.mimetype)) {
      callback(
        new BadRequestException('image must be a JPG, PNG, WEBP, or GIF image'),
        false,
      );
      return;
    }
    callback(null, true);
  },
  limits: { fileSize: 20 * 1024 * 1024 },
} satisfies MulterOptions;

export const getProductionOrderWeighingRecordLotCheckImagePath = (
  file?: Express.Multer.File,
) =>
  file
    ? `${PRODUCTION_ORDER_WEIGHING_RECORD_LOT_CHECK_IMAGE_ROUTE}/${file.filename}`
    : undefined;

const getResolvedFilePath = (filename: string) => {
  const safeFilename = filename.trim();
  if (
    !safeFilename ||
    safeFilename === '.' ||
    safeFilename === '..' ||
    safeFilename.includes('/') ||
    safeFilename.includes('\\') ||
    basename(safeFilename) !== safeFilename
  ) {
    return null;
  }

  const resolvedUploadDir = resolve(UPLOAD_DIR);
  const filePath = resolve(resolvedUploadDir, safeFilename);
  return filePath.startsWith(`${resolvedUploadDir}${sep}`) ? filePath : null;
};

export const resolveProductionOrderWeighingRecordLotCheckImageFile = async (
  filename: string,
  original = false,
) => {
  const filePath = getResolvedFilePath(filename);
  if (!filePath) return null;

  return resolvePreferredImageFile(
    filePath,
    IMAGE_MIME_TYPES_BY_EXTENSION.get(extname(filename).toLowerCase()) ??
      'application/octet-stream',
    { preferThumbnail: !original },
  );
};

export const removeUploadedProductionOrderWeighingRecordLotCheckImage = async (
  file?: Express.Multer.File,
) => {
  if (file?.path) await removeImageAndThumbnail(file.path);
};

export const removeProductionOrderWeighingRecordLotCheckImageByPath = async (
  imagePath?: string | null,
) => {
  if (
    !imagePath?.startsWith(
      `${PRODUCTION_ORDER_WEIGHING_RECORD_LOT_CHECK_IMAGE_ROUTE}/`,
    )
  ) {
    return;
  }
  const filename = imagePath.slice(
    PRODUCTION_ORDER_WEIGHING_RECORD_LOT_CHECK_IMAGE_ROUTE.length + 1,
  );
  const filePath = getResolvedFilePath(filename);
  if (filePath) await removeImageAndThumbnail(filePath);
};
