import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { basename, extname, join, resolve, sep } from 'path';
import {
  removeImageAndThumbnail,
  resolvePreferredImageFile,
  thumbnailDiskStorage,
} from '../../common/utils/image-thumbnail.util';

type UploadFileMetadata = Pick<
  Express.Multer.File,
  'mimetype' | 'originalname'
>;

export const PRODUCTION_ORDER_MATERIAL_PROCESS_SUMMARY_IMAGE_ROUTE =
  '/production-orders/material-process-summaries/images';

export const PRODUCTION_ORDER_MATERIAL_PROCESS_SUMMARY_IMAGE_UPLOAD_DIR = join(
  process.cwd(),
  'uploads',
  'production-order-material-process-summaries',
  'images',
);

const MAX_IMAGE_SIZE_IN_BYTES = 20 * 1024 * 1024;

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

const ensureUploadDir = () => {
  mkdirSync(PRODUCTION_ORDER_MATERIAL_PROCESS_SUMMARY_IMAGE_UPLOAD_DIR, {
    recursive: true,
  });
};

const normalizeOriginalFilename = (originalName: string) => {
  const utf8Filename = Buffer.from(originalName, 'latin1').toString('utf8');
  return utf8Filename.includes('\uFFFD') ? originalName : utf8Filename;
};

const getOriginalNameSegment = (originalName: string) => {
  const normalizedFilename = basename(
    normalizeOriginalFilename(originalName).replace(/\\/g, '/'),
  );
  const originalExtension = extname(normalizedFilename);
  const originalBaseName = originalExtension
    ? normalizedFilename.slice(0, -originalExtension.length)
    : normalizedFilename;
  const sanitizedBaseName = originalBaseName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+/, '')
    .replace(/[.-]+$/, '')
    .slice(0, 120);

  return sanitizedBaseName || 'image';
};

const getStoredExtension = (file: UploadFileMetadata) =>
  IMAGE_EXTENSIONS_BY_MIME_TYPE.get(file.mimetype) ??
  extname(normalizeOriginalFilename(file.originalname)).toLowerCase();

export const productionOrderMaterialProcessSummaryImageUploadOptions = {
  storage: thumbnailDiskStorage({
    destination: (_req, _file, callback) => {
      ensureUploadDir();
      callback(
        null,
        PRODUCTION_ORDER_MATERIAL_PROCESS_SUMMARY_IMAGE_UPLOAD_DIR,
      );
    },
    filename: (_req, file, callback) => {
      callback(
        null,
        `${getOriginalNameSegment(file.originalname)}-${randomUUID()}${getStoredExtension(file)}`,
      );
    },
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
  limits: { fileSize: MAX_IMAGE_SIZE_IN_BYTES },
};

export const getMaterialProcessSummaryImagePath = (
  file?: Express.Multer.File,
) =>
  file
    ? `${PRODUCTION_ORDER_MATERIAL_PROCESS_SUMMARY_IMAGE_ROUTE}/${file.filename}`
    : undefined;

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
  if (!safeFilename) return null;

  const uploadDir = resolve(
    PRODUCTION_ORDER_MATERIAL_PROCESS_SUMMARY_IMAGE_UPLOAD_DIR,
  );
  const filePath = resolve(uploadDir, safeFilename);
  return filePath.startsWith(`${uploadDir}${sep}`) ? filePath : null;
};

export const getMaterialProcessSummaryImageLookupPaths = (filename: string) => {
  const safeFilename = getSafeFilename(filename);
  return safeFilename
    ? [
        `${PRODUCTION_ORDER_MATERIAL_PROCESS_SUMMARY_IMAGE_ROUTE}/${safeFilename}`,
      ]
    : [];
};

export const resolveMaterialProcessSummaryImageFile = async (
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

export const removeUploadedMaterialProcessSummaryImage = async (
  file?: Express.Multer.File,
) => {
  if (file?.path) await removeImageAndThumbnail(file.path);
};

export const removeMaterialProcessSummaryImageByPath = async (
  imagePath?: string | null,
) => {
  if (
    !imagePath?.startsWith(
      `${PRODUCTION_ORDER_MATERIAL_PROCESS_SUMMARY_IMAGE_ROUTE}/`,
    )
  ) {
    return;
  }

  const filename = imagePath.slice(
    PRODUCTION_ORDER_MATERIAL_PROCESS_SUMMARY_IMAGE_ROUTE.length + 1,
  );
  const filePath = getResolvedFilePath(filename);
  if (filePath) await removeImageAndThumbnail(filePath);
};
