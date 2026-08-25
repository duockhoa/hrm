import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { basename, extname, join, resolve, sep } from 'path';
import {
  removeImageAndThumbnail,
  resolvePreferredImageFile,
  thumbnailDiskStorage,
} from '../../common/utils/image-thumbnail.util';

const LEGACY_PRODUCTION_ORDER_DEVIATION_UPLOAD_ROUTE =
  '/uploads/production-order-deviations';
export const PRODUCTION_ORDER_DEVIATION_IMAGE_ROUTE =
  '/production-order-deviations/images';
export const PRODUCTION_ORDER_DEVIATION_UPLOAD_DIR = join(
  process.cwd(),
  'uploads',
  'production-order-deviations',
);

export const ensureProductionOrderDeviationUploadDir = () => {
  mkdirSync(PRODUCTION_ORDER_DEVIATION_UPLOAD_DIR, { recursive: true });
};

const MAX_DEVIATION_IMAGE_SIZE_IN_BYTES = 5 * 1024 * 1024;
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
const STORED_DEVIATION_IMAGE_ROUTES = [
  PRODUCTION_ORDER_DEVIATION_IMAGE_ROUTE,
  LEGACY_PRODUCTION_ORDER_DEVIATION_UPLOAD_ROUTE,
];
export const MAX_DEVIATION_IMAGE_COUNT = 10;

export const productionOrderDeviationImageUploadOptions = {
  storage: thumbnailDiskStorage({
    destination: (_req, _file, callback) => {
      ensureProductionOrderDeviationUploadDir();
      callback(null, PRODUCTION_ORDER_DEVIATION_UPLOAD_DIR);
    },
    filename: (_req, file, callback) => {
      const extension =
        IMAGE_EXTENSIONS_BY_MIME_TYPE.get(file.mimetype) ??
        extname(file.originalname).toLowerCase();

      callback(null, `${randomUUID()}${extension}`);
    },
  }),
  fileFilter: (_req, file, callback) => {
    if (!IMAGE_EXTENSIONS_BY_MIME_TYPE.has(file.mimetype)) {
      callback(
        new BadRequestException(
          'deviation_images must be JPG, PNG, WEBP, or GIF images',
        ),
        false,
      );
      return;
    }

    callback(null, true);
  },
  limits: {
    fileSize: MAX_DEVIATION_IMAGE_SIZE_IN_BYTES,
  },
};

export const getDeviationImagePath = (file?: Express.Multer.File) => {
  if (!file) {
    return undefined;
  }

  return `${PRODUCTION_ORDER_DEVIATION_IMAGE_ROUTE}/${file.filename}`;
};

export const getDeviationImagePaths = (files?: Express.Multer.File[]) =>
  files
    ?.map((file) => getDeviationImagePath(file))
    .filter((imagePath): imagePath is string => Boolean(imagePath)) ?? [];

const getSafeDeviationImageFilename = (filename: string) => {
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

const getDeviationImageFilePath = (filename: string) => {
  const safeFilename = getSafeDeviationImageFilename(filename);

  if (!safeFilename) {
    return null;
  }

  const uploadDir = resolve(PRODUCTION_ORDER_DEVIATION_UPLOAD_DIR);
  const filePath = resolve(uploadDir, safeFilename);

  if (!filePath.startsWith(`${uploadDir}${sep}`)) {
    return null;
  }

  return filePath;
};

const getDeviationImageContentType = (filename: string) =>
  IMAGE_MIME_TYPES_BY_EXTENSION.get(extname(filename).toLowerCase()) ?? null;

const getStoredDeviationImageFilename = (imagePath?: string | null) => {
  if (!imagePath) {
    return null;
  }

  const route = STORED_DEVIATION_IMAGE_ROUTES.find((storedRoute) =>
    imagePath.startsWith(`${storedRoute}/`),
  );

  if (!route) {
    return null;
  }

  return getSafeDeviationImageFilename(basename(imagePath));
};

export const getDeviationImageLookupPaths = (filename: string) => {
  const safeFilename = getSafeDeviationImageFilename(filename);

  if (!safeFilename) {
    return [];
  }

  return STORED_DEVIATION_IMAGE_ROUTES.map(
    (route) => `${route}/${safeFilename}`,
  );
};

export const getAuthenticatedDeviationImagePath = (
  imagePath?: string | null,
) => {
  const filename = getStoredDeviationImageFilename(imagePath);

  if (!filename) {
    return imagePath ?? null;
  }

  return `${PRODUCTION_ORDER_DEVIATION_IMAGE_ROUTE}/${filename}`;
};

export const getAuthenticatedDeviationImagePaths = (
  imagePaths?: Array<string | null | undefined>,
) =>
  imagePaths
    ?.map((imagePath) => getAuthenticatedDeviationImagePath(imagePath))
    .filter((imagePath): imagePath is string => Boolean(imagePath)) ?? [];

export const resolveDeviationImageFile = async (filename: string) => {
  const filePath = getDeviationImageFilePath(filename);
  const contentType = getDeviationImageContentType(filename);

  if (!filePath || !contentType) {
    return null;
  }

  return resolvePreferredImageFile(filePath, contentType);
};

export const removeUploadedDeviationImage = async (
  file?: Express.Multer.File,
) => {
  if (!file?.path) {
    return;
  }

  await removeImageAndThumbnail(file.path);
};

export const removeUploadedDeviationImages = async (
  files?: Express.Multer.File[],
) => {
  await Promise.all(
    files?.map((file) => removeUploadedDeviationImage(file)) ?? [],
  );
};

export const removeStoredDeviationImage = async (imagePath?: string | null) => {
  const filename = getStoredDeviationImageFilename(imagePath);

  if (!filename) {
    return;
  }

  const filePath = getDeviationImageFilePath(filename);

  if (!filePath) {
    return;
  }

  await removeImageAndThumbnail(filePath);
};

export const removeStoredDeviationImages = async (
  imagePaths?: Array<string | null | undefined>,
) => {
  await Promise.all(
    imagePaths?.map((imagePath) => removeStoredDeviationImage(imagePath)) ?? [],
  );
};
