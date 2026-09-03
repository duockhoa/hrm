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

export const PRODUCTION_ORDER_VOLUME_CHECK_IMAGE_ROUTE =
  '/production-orders/volume-checks/images';

export const PRODUCTION_ORDER_VOLUME_CHECK_IMAGE_UPLOAD_DIR = join(
  process.cwd(),
  'uploads',
  'production-order-volume-checks',
  'images',
);

const MAX_IMAGE_SIZE_IN_BYTES = 20 * 1024 * 1024;
export const MAX_VOLUME_CHECK_IMAGE_COUNT = 10;

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

const ensureUploadDirectory = () => {
  mkdirSync(PRODUCTION_ORDER_VOLUME_CHECK_IMAGE_UPLOAD_DIR, {
    recursive: true,
  });
};

const normalizeOriginalFilename = (originalName: string) => {
  const utf8Filename = Buffer.from(originalName, 'latin1').toString('utf8');
  return utf8Filename.includes('\uFFFD') ? originalName : utf8Filename;
};

const getStoredFilename = (file: UploadFileMetadata) => {
  const filename = basename(
    normalizeOriginalFilename(file.originalname).replace(/\\/g, '/'),
  );
  const extension =
    IMAGE_EXTENSIONS_BY_MIME_TYPE.get(file.mimetype) ??
    extname(filename).toLowerCase();
  const baseName = filename
    .slice(0, filename.length - extname(filename).length)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 120);

  return `${baseName || 'image'}-${randomUUID()}${extension}`;
};

export const productionOrderVolumeCheckImageUploadOptions = {
  storage: thumbnailDiskStorage({
    destination: (_req, _file, callback) => {
      ensureUploadDirectory();
      callback(null, PRODUCTION_ORDER_VOLUME_CHECK_IMAGE_UPLOAD_DIR);
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
  limits: { fileSize: MAX_IMAGE_SIZE_IN_BYTES },
};

export const getVolumeCheckImagePaths = (files?: Express.Multer.File[]) =>
  files?.map(
    (file) => `${PRODUCTION_ORDER_VOLUME_CHECK_IMAGE_ROUTE}/${file.filename}`,
  ) ?? [];

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

  const uploadDir = resolve(PRODUCTION_ORDER_VOLUME_CHECK_IMAGE_UPLOAD_DIR);
  const filePath = resolve(uploadDir, safeFilename);
  return filePath.startsWith(`${uploadDir}${sep}`) ? filePath : null;
};

export const getVolumeCheckImageLookupPaths = (filename: string) => {
  const safeFilename = getSafeFilename(filename);
  return safeFilename
    ? [`${PRODUCTION_ORDER_VOLUME_CHECK_IMAGE_ROUTE}/${safeFilename}`]
    : [];
};

export const resolveVolumeCheckImageFile = async (
  filename: string,
  original = false,
) => {
  const filePath = getResolvedFilePath(filename);
  if (!filePath) {
    return null;
  }

  const contentType =
    IMAGE_MIME_TYPES_BY_EXTENSION.get(extname(filename).toLowerCase()) ??
    'application/octet-stream';
  return resolvePreferredImageFile(filePath, contentType, {
    preferThumbnail: !original,
  });
};

export const removeUploadedVolumeCheckImages = async (
  files?: Express.Multer.File[],
) =>
  Promise.all(files?.map((file) => removeImageAndThumbnail(file.path)) ?? []);

export const removeVolumeCheckImagesByPath = async (
  imagePaths?: Array<string | null | undefined>,
) =>
  Promise.all(
    imagePaths?.map(async (imagePath) => {
      if (
        !imagePath?.startsWith(`${PRODUCTION_ORDER_VOLUME_CHECK_IMAGE_ROUTE}/`)
      ) {
        return;
      }

      const filePath = getResolvedFilePath(
        imagePath.slice(PRODUCTION_ORDER_VOLUME_CHECK_IMAGE_ROUTE.length + 1),
      );
      if (filePath) {
        await removeImageAndThumbnail(filePath);
      }
    }) ?? [],
  );
