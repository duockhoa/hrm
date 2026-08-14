import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { stat, unlink } from 'fs/promises';
import { diskStorage } from 'multer';
import { basename, extname, join, resolve, sep } from 'path';

type UploadFileMetadata = Pick<
  Express.Multer.File,
  'mimetype' | 'originalname'
>;

export const EQUIPMENT_MONITORING_RECORD_IMAGE_ROUTE =
  '/equipment/monitoring-records/images';

const EQUIPMENT_MONITORING_RECORD_IMAGE_UPLOAD_DIR = join(
  process.cwd(),
  'uploads',
  'equipment-monitoring-records',
  'images',
);

export const MAX_EQUIPMENT_MONITORING_RECORD_IMAGE_COUNT = 10;
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
    EQUIPMENT_MONITORING_RECORD_IMAGE_UPLOAD_DIR,
  );
  const filePath = resolve(resolvedUploadDir, safeFilename);
  return filePath.startsWith(`${resolvedUploadDir}${sep}`) ? filePath : null;
};

export const equipmentMonitoringRecordImageUploadOptions = {
  storage: diskStorage({
    destination: (_req, _file, callback) => {
      mkdirSync(EQUIPMENT_MONITORING_RECORD_IMAGE_UPLOAD_DIR, {
        recursive: true,
      });
      callback(null, EQUIPMENT_MONITORING_RECORD_IMAGE_UPLOAD_DIR);
    },
    filename: (_req, file, callback) => callback(null, getStoredFilename(file)),
  }),
  fileFilter: (_req, file, callback) => {
    if (!IMAGE_EXTENSIONS_BY_MIME_TYPE.has(file.mimetype)) {
      callback(
        new BadRequestException('images must be JPG, PNG, WEBP, or GIF images'),
        false,
      );
      return;
    }

    callback(null, true);
  },
  limits: { fileSize: MAX_IMAGE_SIZE_IN_BYTES },
};

export const getEquipmentMonitoringRecordImagePaths = (
  files?: Express.Multer.File[],
) =>
  files
    ?.map(
      (file) => `${EQUIPMENT_MONITORING_RECORD_IMAGE_ROUTE}/${file.filename}`,
    )
    .filter((imagePath): imagePath is string => Boolean(imagePath)) ?? [];

export const getEquipmentMonitoringRecordImageLookupPaths = (
  filename: string,
) => {
  const safeFilename = getSafeFilename(filename);
  return safeFilename
    ? [`${EQUIPMENT_MONITORING_RECORD_IMAGE_ROUTE}/${safeFilename}`]
    : [];
};

export const resolveEquipmentMonitoringRecordImageFile = async (
  filename: string,
) => {
  const filePath = getResolvedFilePath(filename);
  if (!filePath) {
    return null;
  }

  const fileStat = await stat(filePath).catch(() => null);
  if (!fileStat?.isFile()) {
    return null;
  }

  return {
    filePath,
    size: fileStat.size,
    contentType:
      IMAGE_MIME_TYPES_BY_EXTENSION.get(extname(filename).toLowerCase()) ??
      'application/octet-stream',
  };
};

export const removeUploadedEquipmentMonitoringRecordImages = async (
  files?: Express.Multer.File[],
) => {
  await Promise.all(
    files?.map((file) => unlink(file.path).catch(() => undefined)) ?? [],
  );
};

export const removeStoredEquipmentMonitoringRecordImage = async (
  imagePath?: string | null,
) => {
  if (!imagePath?.startsWith(`${EQUIPMENT_MONITORING_RECORD_IMAGE_ROUTE}/`)) {
    return;
  }

  const filePath = getResolvedFilePath(basename(imagePath));
  if (filePath) {
    await unlink(filePath).catch(() => undefined);
  }
};
