import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { basename, extname, join, resolve, sep } from 'path';
import {
  removeImageAndThumbnail,
  resolvePreferredImageFile,
  thumbnailDiskStorage,
} from '../../common/utils/image-thumbnail.util';

type PostPreparationSolutionCheckUploadFileMetadata = Pick<
  Express.Multer.File,
  'mimetype' | 'originalname'
>;

export const PRODUCTION_ORDER_POST_PREPARATION_SOLUTION_CHECK_IMAGE_ROUTE =
  '/production-orders/post-preparation-solution-checks/images';

const PRODUCTION_ORDER_POST_PREPARATION_SOLUTION_CHECK_UPLOAD_DIR = join(
  process.cwd(),
  'uploads',
  'production-order-post-preparation-solution-checks',
);
export const PRODUCTION_ORDER_POST_PREPARATION_SOLUTION_CHECK_IMAGE_UPLOAD_DIR =
  join(PRODUCTION_ORDER_POST_PREPARATION_SOLUTION_CHECK_UPLOAD_DIR, 'images');

const MAX_POST_PREPARATION_SOLUTION_CHECK_IMAGE_SIZE_IN_BYTES =
  20 * 1024 * 1024;

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

const ensureProductionOrderPostPreparationSolutionCheckUploadDirs = () => {
  mkdirSync(PRODUCTION_ORDER_POST_PREPARATION_SOLUTION_CHECK_IMAGE_UPLOAD_DIR, {
    recursive: true,
  });
};

const normalizeOriginalFilename = (originalName: string) => {
  const utf8Filename = Buffer.from(originalName, 'latin1').toString('utf8');

  if (utf8Filename.includes('\uFFFD')) {
    return originalName;
  }

  return utf8Filename;
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

const getStoredExtension = (
  file: PostPreparationSolutionCheckUploadFileMetadata,
) =>
  IMAGE_EXTENSIONS_BY_MIME_TYPE.get(file.mimetype) ??
  extname(normalizeOriginalFilename(file.originalname)).toLowerCase();

export const getPostPreparationSolutionCheckUploadStoredFilename = (
  file: PostPreparationSolutionCheckUploadFileMetadata,
) =>
  `${getOriginalNameSegment(file.originalname)}-${randomUUID()}${getStoredExtension(file)}`;

export const productionOrderPostPreparationSolutionCheckImageUploadOptions = {
  storage: thumbnailDiskStorage({
    destination: (_req, _file, callback) => {
      ensureProductionOrderPostPreparationSolutionCheckUploadDirs();
      callback(
        null,
        PRODUCTION_ORDER_POST_PREPARATION_SOLUTION_CHECK_IMAGE_UPLOAD_DIR,
      );
    },
    filename: (_req, file, callback) => {
      callback(null, getPostPreparationSolutionCheckUploadStoredFilename(file));
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
  limits: {
    fileSize: MAX_POST_PREPARATION_SOLUTION_CHECK_IMAGE_SIZE_IN_BYTES,
  },
};

export const getPostPreparationSolutionCheckImagePath = (
  file?: Express.Multer.File,
) => {
  if (!file) {
    return undefined;
  }

  return `${PRODUCTION_ORDER_POST_PREPARATION_SOLUTION_CHECK_IMAGE_ROUTE}/${file.filename}`;
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
    PRODUCTION_ORDER_POST_PREPARATION_SOLUTION_CHECK_IMAGE_UPLOAD_DIR,
  );
  const filePath = resolve(resolvedUploadDir, safeFilename);

  if (!filePath.startsWith(`${resolvedUploadDir}${sep}`)) {
    return null;
  }

  return filePath;
};

export const getPostPreparationSolutionCheckImageLookupPaths = (
  filename: string,
) => {
  const safeFilename = getSafeFilename(filename);

  return safeFilename
    ? [
        `${PRODUCTION_ORDER_POST_PREPARATION_SOLUTION_CHECK_IMAGE_ROUTE}/${safeFilename}`,
      ]
    : [];
};

export const resolvePostPreparationSolutionCheckImageFile = async (
  filename: string,
  original = false,
) => {
  const filePath = getResolvedFilePath(filename);
  const contentType =
    IMAGE_MIME_TYPES_BY_EXTENSION.get(extname(filename).toLowerCase()) ??
    'application/octet-stream';

  if (!filePath) {
    return null;
  }

  return resolvePreferredImageFile(filePath, contentType, {
    preferThumbnail: !original,
  });
};

export const removeUploadedPostPreparationSolutionCheckImage = async (
  file?: Express.Multer.File,
) => {
  if (!file?.path) {
    return;
  }

  await removeImageAndThumbnail(file.path);
};

export const removePostPreparationSolutionCheckImageByPath = async (
  imagePath?: string | null,
) => {
  if (
    !imagePath?.startsWith(
      `${PRODUCTION_ORDER_POST_PREPARATION_SOLUTION_CHECK_IMAGE_ROUTE}/`,
    )
  ) {
    return;
  }

  const filename = imagePath.slice(
    PRODUCTION_ORDER_POST_PREPARATION_SOLUTION_CHECK_IMAGE_ROUTE.length + 1,
  );
  const filePath = getResolvedFilePath(filename);

  if (!filePath) {
    return;
  }

  await removeImageAndThumbnail(filePath);
};
