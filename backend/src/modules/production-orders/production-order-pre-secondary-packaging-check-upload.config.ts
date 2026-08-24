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

export const PRE_SECONDARY_PACKAGING_CHECK_IMAGE_ROUTE =
  '/production-orders/pre-secondary-packaging-checks/images';

const uploadDirectory = join(
  process.cwd(),
  'uploads',
  'production-order-pre-secondary-packaging-checks',
  'images',
);

export const MAX_PRE_SECONDARY_PACKAGING_CHECK_IMAGE_COUNT = 10;
const MAX_IMAGE_SIZE_IN_BYTES = 20 * 1024 * 1024;

const extensionsByMimeType = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);
const mimeTypesByExtension = new Map(
  Array.from(extensionsByMimeType, ([mimeType, extension]) => [
    extension,
    mimeType,
  ]),
);
mimeTypesByExtension.set('.jpeg', 'image/jpeg');

const normalizeOriginalFilename = (originalName: string) => {
  const utf8Filename = Buffer.from(originalName, 'latin1').toString('utf8');
  return utf8Filename.includes('\uFFFD') ? originalName : utf8Filename;
};

const getStoredFilename = (file: UploadFileMetadata) => {
  const filename = basename(normalizeOriginalFilename(file.originalname));
  const extension =
    extensionsByMimeType.get(file.mimetype) ?? extname(filename).toLowerCase();
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

export const preSecondaryPackagingCheckImageUploadOptions = {
  storage: diskStorage({
    destination: (_req, _file, callback) => {
      mkdirSync(uploadDirectory, { recursive: true });
      callback(null, uploadDirectory);
    },
    filename: (_req, file, callback) => callback(null, getStoredFilename(file)),
  }),
  fileFilter: (_req, file, callback) => {
    if (!extensionsByMimeType.has(file.mimetype)) {
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

export const getPreSecondaryPackagingCheckImagePaths = (
  files?: Express.Multer.File[],
) =>
  files?.map(
    (file) => `${PRE_SECONDARY_PACKAGING_CHECK_IMAGE_ROUTE}/${file.filename}`,
  ) ?? [];

const getSafeFilename = (filename: string) => {
  const normalizedFilename = filename.trim();
  if (
    !normalizedFilename ||
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

  const resolvedUploadDirectory = resolve(uploadDirectory);
  const filePath = resolve(resolvedUploadDirectory, safeFilename);
  return filePath.startsWith(`${resolvedUploadDirectory}${sep}`)
    ? filePath
    : null;
};

export const getPreSecondaryPackagingCheckImageLookupPaths = (
  filename: string,
) => {
  const safeFilename = getSafeFilename(filename);
  return safeFilename
    ? [`${PRE_SECONDARY_PACKAGING_CHECK_IMAGE_ROUTE}/${safeFilename}`]
    : [];
};

export const resolvePreSecondaryPackagingCheckImageFile = async (
  filename: string,
) => {
  const filePath = getResolvedFilePath(filename);
  if (!filePath) return null;

  const fileStat = await stat(filePath).catch(() => null);
  if (!fileStat?.isFile()) return null;

  return {
    filePath,
    size: fileStat.size,
    contentType:
      mimeTypesByExtension.get(extname(filename).toLowerCase()) ??
      'application/octet-stream',
  };
};

export const removeUploadedPreSecondaryPackagingCheckImages = async (
  files?: Express.Multer.File[],
) =>
  Promise.all(
    files?.map((file) => unlink(file.path).catch(() => undefined)) ?? [],
  );

const removePreSecondaryPackagingCheckImageByPath = async (
  imagePath?: string | null,
) => {
  if (!imagePath?.startsWith(`${PRE_SECONDARY_PACKAGING_CHECK_IMAGE_ROUTE}/`)) {
    return;
  }
  const filePath = getResolvedFilePath(
    imagePath.slice(PRE_SECONDARY_PACKAGING_CHECK_IMAGE_ROUTE.length + 1),
  );
  if (filePath) await unlink(filePath).catch(() => undefined);
};

export const removePreSecondaryPackagingCheckImagesByPath = async (
  imagePaths?: Array<string | null | undefined>,
) =>
  Promise.all(
    imagePaths?.map((imagePath) =>
      removePreSecondaryPackagingCheckImageByPath(imagePath),
    ) ?? [],
  );
