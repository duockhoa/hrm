import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { stat, unlink } from 'fs/promises';
import { diskStorage } from 'multer';
import { basename, extname, join, resolve, sep } from 'path';

type SteamSterilizationCheckUploadFileMetadata = Pick<
  Express.Multer.File,
  'mimetype' | 'originalname'
>;

export const PRODUCTION_ORDER_STEAM_STERILIZATION_CHECK_IMAGE_ROUTE =
  '/production-orders/steam-sterilization-checks/images';

const PRODUCTION_ORDER_STEAM_STERILIZATION_CHECK_UPLOAD_DIR = join(
  process.cwd(),
  'uploads',
  'production-order-steam-sterilization-checks',
);
export const PRODUCTION_ORDER_STEAM_STERILIZATION_CHECK_IMAGE_UPLOAD_DIR = join(
  PRODUCTION_ORDER_STEAM_STERILIZATION_CHECK_UPLOAD_DIR,
  'images',
);

const MAX_STEAM_STERILIZATION_CHECK_IMAGE_SIZE_IN_BYTES = 20 * 1024 * 1024;

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

const ensureProductionOrderSteamSterilizationCheckUploadDirs = () => {
  mkdirSync(PRODUCTION_ORDER_STEAM_STERILIZATION_CHECK_IMAGE_UPLOAD_DIR, {
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

const getStoredExtension = (file: SteamSterilizationCheckUploadFileMetadata) =>
  IMAGE_EXTENSIONS_BY_MIME_TYPE.get(file.mimetype) ??
  extname(normalizeOriginalFilename(file.originalname)).toLowerCase();

export const getSteamSterilizationCheckUploadStoredFilename = (
  file: SteamSterilizationCheckUploadFileMetadata,
) =>
  `${getOriginalNameSegment(file.originalname)}-${randomUUID()}${getStoredExtension(file)}`;

export const productionOrderSteamSterilizationCheckImageUploadOptions = {
  storage: diskStorage({
    destination: (_req, _file, callback) => {
      ensureProductionOrderSteamSterilizationCheckUploadDirs();
      callback(
        null,
        PRODUCTION_ORDER_STEAM_STERILIZATION_CHECK_IMAGE_UPLOAD_DIR,
      );
    },
    filename: (_req, file, callback) => {
      callback(null, getSteamSterilizationCheckUploadStoredFilename(file));
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
    fileSize: MAX_STEAM_STERILIZATION_CHECK_IMAGE_SIZE_IN_BYTES,
  },
};

export const getSteamSterilizationCheckImagePath = (
  file?: Express.Multer.File,
) => {
  if (!file) {
    return undefined;
  }

  return `${PRODUCTION_ORDER_STEAM_STERILIZATION_CHECK_IMAGE_ROUTE}/${file.filename}`;
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

const getStoredFilename = (filePath: string | null | undefined) => {
  if (
    !filePath?.startsWith(
      `${PRODUCTION_ORDER_STEAM_STERILIZATION_CHECK_IMAGE_ROUTE}/`,
    )
  ) {
    return null;
  }

  return getSafeFilename(basename(filePath));
};

const getResolvedFilePath = (filename: string) => {
  const safeFilename = getSafeFilename(filename);

  if (!safeFilename) {
    return null;
  }

  const resolvedUploadDir = resolve(
    PRODUCTION_ORDER_STEAM_STERILIZATION_CHECK_IMAGE_UPLOAD_DIR,
  );
  const filePath = resolve(resolvedUploadDir, safeFilename);

  if (!filePath.startsWith(`${resolvedUploadDir}${sep}`)) {
    return null;
  }

  return filePath;
};

export const getSteamSterilizationCheckImageLookupPaths = (
  filename: string,
) => {
  const safeFilename = getSafeFilename(filename);

  return safeFilename
    ? [
        `${PRODUCTION_ORDER_STEAM_STERILIZATION_CHECK_IMAGE_ROUTE}/${safeFilename}`,
      ]
    : [];
};

export const resolveSteamSterilizationCheckImageFile = async (
  filename: string,
) => {
  const filePath = getResolvedFilePath(filename);
  const contentType =
    IMAGE_MIME_TYPES_BY_EXTENSION.get(extname(filename).toLowerCase()) ??
    'application/octet-stream';

  if (!filePath) {
    return null;
  }

  const fileStat = await stat(filePath).catch(() => null);

  if (!fileStat?.isFile()) {
    return null;
  }

  return {
    contentType,
    filePath,
    size: fileStat.size,
  };
};

export const removeUploadedSteamSterilizationCheckImage = async (
  file?: Express.Multer.File,
) => {
  if (!file?.path) {
    return;
  }

  await unlink(file.path).catch(() => undefined);
};

export const removeUploadedSteamSterilizationCheckImages = async (
  files?: Express.Multer.File[],
) => {
  await Promise.all(
    files?.map((file) => removeUploadedSteamSterilizationCheckImage(file)) ??
      [],
  );
};

export const removeStoredSteamSterilizationCheckImage = async (
  imagePath?: string | null,
) => {
  const filename = getStoredFilename(imagePath);

  if (!filename) {
    return;
  }

  const filePath = getResolvedFilePath(filename);

  if (!filePath) {
    return;
  }

  await unlink(filePath).catch(() => undefined);
};

export const removeStoredSteamSterilizationCheckImages = async (
  imagePaths?: Array<string | null | undefined>,
) => {
  await Promise.all(
    imagePaths?.map((imagePath) =>
      removeStoredSteamSterilizationCheckImage(imagePath),
    ) ?? [],
  );
};
