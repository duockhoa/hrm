import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { basename, extname, join, resolve, sep } from 'path';
import {
  removeImageAndThumbnail,
  resolvePreferredImageFile,
  thumbnailDiskStorage,
} from '../../common/utils/image-thumbnail.util';

type ImageUploadFileMetadata = Pick<
  Express.Multer.File,
  'mimetype' | 'originalname'
>;

export const DATE_PRINT_TEMPLATE_IMAGE_ROUTE =
  '/items/date-print-templates/images';

const UPLOAD_DIR = join(
  process.cwd(),
  'uploads',
  'date-print-templates',
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

const getStoredFilename = (file: ImageUploadFileMetadata) => {
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

export const datePrintTemplateImageUploadOptions = {
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
};

export const getDatePrintTemplateImagePath = (file?: Express.Multer.File) =>
  file ? `${DATE_PRINT_TEMPLATE_IMAGE_ROUTE}/${file.filename}` : undefined;

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

export const getDatePrintTemplateImageLookupPaths = (filename: string) => {
  const filePath = getResolvedFilePath(filename);
  return filePath
    ? [`${DATE_PRINT_TEMPLATE_IMAGE_ROUTE}/${filename.trim()}`]
    : [];
};

export const resolveDatePrintTemplateImageFile = async (
  filename: string,
  original = false,
) => {
  const filePath = getResolvedFilePath(filename);
  if (!filePath) {
    return null;
  }

  return resolvePreferredImageFile(
    filePath,
    IMAGE_MIME_TYPES_BY_EXTENSION.get(extname(filename).toLowerCase()) ??
      'application/octet-stream',
    { preferThumbnail: !original },
  );
};

export const removeUploadedDatePrintTemplateImage = async (
  file?: Express.Multer.File,
) => {
  if (file?.path) {
    await removeImageAndThumbnail(file.path);
  }
};

export const removeDatePrintTemplateImageByPath = async (
  imagePath?: string | null,
) => {
  if (!imagePath?.startsWith(`${DATE_PRINT_TEMPLATE_IMAGE_ROUTE}/`)) {
    return;
  }

  const filename = imagePath.slice(DATE_PRINT_TEMPLATE_IMAGE_ROUTE.length + 1);
  const filePath = getResolvedFilePath(filename);
  if (filePath) {
    await removeImageAndThumbnail(filePath);
  }
};
