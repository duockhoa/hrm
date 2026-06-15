import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { stat, unlink } from 'fs/promises';
import { diskStorage } from 'multer';
import { basename, extname, join, resolve, sep } from 'path';

export const PRODUCTION_ORDER_DATE_CHECK_IMAGE_ROUTE =
  '/production-orders/date-checks/images';
export const PRODUCTION_ORDER_DATE_CHECK_REQUEST_FILE_ROUTE =
  '/production-orders/date-checks/request-files';

const PRODUCTION_ORDER_DATE_CHECK_UPLOAD_DIR = join(
  process.cwd(),
  'uploads',
  'production-order-date-checks',
);
export const PRODUCTION_ORDER_DATE_CHECK_IMAGE_UPLOAD_DIR = join(
  PRODUCTION_ORDER_DATE_CHECK_UPLOAD_DIR,
  'images',
);
export const PRODUCTION_ORDER_DATE_CHECK_REQUEST_FILE_UPLOAD_DIR = join(
  PRODUCTION_ORDER_DATE_CHECK_UPLOAD_DIR,
  'request-files',
);

export const MAX_DATE_CHECK_IMAGE_COUNT = 10;

const MAX_DATE_CHECK_FILE_SIZE_IN_BYTES = 20 * 1024 * 1024;

const IMAGE_EXTENSIONS_BY_MIME_TYPE = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);

const REQUEST_FILE_EXTENSIONS_BY_MIME_TYPE = new Map([
  ['application/pdf', '.pdf'],
  ['application/msword', '.doc'],
  [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.docx',
  ],
  ['application/vnd.ms-excel', '.xls'],
  [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xlsx',
  ],
  ['text/plain', '.txt'],
  ['text/csv', '.csv'],
  ...Array.from(IMAGE_EXTENSIONS_BY_MIME_TYPE),
]);

const REQUEST_FILE_MIME_TYPES_BY_EXTENSION = new Map(
  Array.from(REQUEST_FILE_EXTENSIONS_BY_MIME_TYPE, ([mimeType, extension]) => [
    extension,
    mimeType,
  ]),
);
REQUEST_FILE_MIME_TYPES_BY_EXTENSION.set('.jpeg', 'image/jpeg');

const IMAGE_MIME_TYPES_BY_EXTENSION = new Map(
  Array.from(IMAGE_EXTENSIONS_BY_MIME_TYPE, ([mimeType, extension]) => [
    extension,
    mimeType,
  ]),
);
IMAGE_MIME_TYPES_BY_EXTENSION.set('.jpeg', 'image/jpeg');

const ensureProductionOrderDateCheckUploadDirs = () => {
  mkdirSync(PRODUCTION_ORDER_DATE_CHECK_IMAGE_UPLOAD_DIR, {
    recursive: true,
  });
  mkdirSync(PRODUCTION_ORDER_DATE_CHECK_REQUEST_FILE_UPLOAD_DIR, {
    recursive: true,
  });
};

const getUploadDestination = (fieldName: string) => {
  if (fieldName === 'request_file') {
    return PRODUCTION_ORDER_DATE_CHECK_REQUEST_FILE_UPLOAD_DIR;
  }

  return PRODUCTION_ORDER_DATE_CHECK_IMAGE_UPLOAD_DIR;
};

const getStoredExtension = (file: Express.Multer.File) => {
  if (file.fieldname === 'request_file') {
    return (
      REQUEST_FILE_EXTENSIONS_BY_MIME_TYPE.get(file.mimetype) ??
      extname(file.originalname).toLowerCase()
    );
  }

  return (
    IMAGE_EXTENSIONS_BY_MIME_TYPE.get(file.mimetype) ??
    extname(file.originalname).toLowerCase()
  );
};

const getOriginalNameSegment = (originalName: string) => {
  const normalizedFilename = basename(originalName.replace(/\\/g, '/'));
  const originalExtension = extname(normalizedFilename);
  const originalBaseName = originalExtension
    ? normalizedFilename.slice(0, -originalExtension.length)
    : normalizedFilename;

  const sanitizedBaseName = originalBaseName
    .normalize('NFC')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
    .slice(0, 120);

  return sanitizedBaseName || 'file';
};

const getUploadStoredFilename = (file: Express.Multer.File) =>
  `${getOriginalNameSegment(file.originalname)}-${randomUUID()}${getStoredExtension(file)}`;

const getRequestFileExtension = (file: Express.Multer.File) =>
  extname(file.originalname).toLowerCase();

const isAllowedRequestFile = (file: Express.Multer.File) =>
  REQUEST_FILE_EXTENSIONS_BY_MIME_TYPE.has(file.mimetype) ||
  REQUEST_FILE_MIME_TYPES_BY_EXTENSION.has(getRequestFileExtension(file));

export const productionOrderDateCheckUploadOptions = {
  storage: diskStorage({
    destination: (_req, file, callback) => {
      ensureProductionOrderDateCheckUploadDirs();
      callback(null, getUploadDestination(file.fieldname));
    },
    filename: (_req, file, callback) => {
      callback(null, getUploadStoredFilename(file));
    },
  }),
  fileFilter: (_req, file, callback) => {
    if (file.fieldname === 'request_file') {
      if (!isAllowedRequestFile(file)) {
        callback(
          new BadRequestException(
            'request_file must be PDF, Word, Excel, TXT, CSV, JPG, PNG, WEBP, or GIF',
          ),
          false,
        );
        return;
      }

      callback(null, true);
      return;
    }

    if (!IMAGE_EXTENSIONS_BY_MIME_TYPE.has(file.mimetype)) {
      callback(
        new BadRequestException('images must be JPG, PNG, WEBP, or GIF images'),
        false,
      );
      return;
    }

    callback(null, true);
  },
  limits: {
    fileSize: MAX_DATE_CHECK_FILE_SIZE_IN_BYTES,
  },
};

export const getDateCheckRequestFilePath = (file?: Express.Multer.File) => {
  if (!file) {
    return undefined;
  }

  return `${PRODUCTION_ORDER_DATE_CHECK_REQUEST_FILE_ROUTE}/${file.filename}`;
};

export const getDateCheckImagePath = (file?: Express.Multer.File) => {
  if (!file) {
    return undefined;
  }

  return `${PRODUCTION_ORDER_DATE_CHECK_IMAGE_ROUTE}/${file.filename}`;
};

export const getDateCheckImagePaths = (files?: Express.Multer.File[]) =>
  files
    ?.map((file) => getDateCheckImagePath(file))
    .filter((imagePath): imagePath is string => Boolean(imagePath)) ?? [];

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

const getStoredFilename = (
  filePath: string | null | undefined,
  route: string,
) => {
  if (!filePath?.startsWith(`${route}/`)) {
    return null;
  }

  return getSafeFilename(basename(filePath));
};

const getResolvedFilePath = (filename: string, uploadDir: string) => {
  const safeFilename = getSafeFilename(filename);

  if (!safeFilename) {
    return null;
  }

  const resolvedUploadDir = resolve(uploadDir);
  const filePath = resolve(resolvedUploadDir, safeFilename);

  if (!filePath.startsWith(`${resolvedUploadDir}${sep}`)) {
    return null;
  }

  return filePath;
};

const resolveStoredFile = async (
  filename: string,
  uploadDir: string,
  mimeTypesByExtension: Map<string, string>,
) => {
  const filePath = getResolvedFilePath(filename, uploadDir);
  const contentType =
    mimeTypesByExtension.get(extname(filename).toLowerCase()) ??
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

export const getDateCheckImageLookupPaths = (filename: string) => {
  const safeFilename = getSafeFilename(filename);

  return safeFilename
    ? [`${PRODUCTION_ORDER_DATE_CHECK_IMAGE_ROUTE}/${safeFilename}`]
    : [];
};

export const getDateCheckRequestFileLookupPaths = (filename: string) => {
  const safeFilename = getSafeFilename(filename);

  return safeFilename
    ? [`${PRODUCTION_ORDER_DATE_CHECK_REQUEST_FILE_ROUTE}/${safeFilename}`]
    : [];
};

export const resolveDateCheckImageFile = (filename: string) =>
  resolveStoredFile(
    filename,
    PRODUCTION_ORDER_DATE_CHECK_IMAGE_UPLOAD_DIR,
    IMAGE_MIME_TYPES_BY_EXTENSION,
  );

export const resolveDateCheckRequestFile = (filename: string) =>
  resolveStoredFile(
    filename,
    PRODUCTION_ORDER_DATE_CHECK_REQUEST_FILE_UPLOAD_DIR,
    REQUEST_FILE_MIME_TYPES_BY_EXTENSION,
  );

export const removeUploadedDateCheckFile = async (
  file?: Express.Multer.File,
) => {
  if (!file?.path) {
    return;
  }

  await unlink(file.path).catch(() => undefined);
};

export const removeUploadedDateCheckFiles = async (
  files?: Express.Multer.File[],
) => {
  await Promise.all(
    files?.map((file) => removeUploadedDateCheckFile(file)) ?? [],
  );
};

const removeStoredFile = async (
  storedPath: string | null | undefined,
  route: string,
  uploadDir: string,
) => {
  const filename = getStoredFilename(storedPath, route);

  if (!filename) {
    return;
  }

  const filePath = getResolvedFilePath(filename, uploadDir);

  if (!filePath) {
    return;
  }

  await unlink(filePath).catch(() => undefined);
};

export const removeStoredDateCheckRequestFile = (
  requestFilePath?: string | null,
) =>
  removeStoredFile(
    requestFilePath,
    PRODUCTION_ORDER_DATE_CHECK_REQUEST_FILE_ROUTE,
    PRODUCTION_ORDER_DATE_CHECK_REQUEST_FILE_UPLOAD_DIR,
  );

export const removeStoredDateCheckImage = (imagePath?: string | null) =>
  removeStoredFile(
    imagePath,
    PRODUCTION_ORDER_DATE_CHECK_IMAGE_ROUTE,
    PRODUCTION_ORDER_DATE_CHECK_IMAGE_UPLOAD_DIR,
  );

export const removeStoredDateCheckImages = async (
  imagePaths?: Array<string | null | undefined>,
) => {
  await Promise.all(
    imagePaths?.map((imagePath) => removeStoredDateCheckImage(imagePath)) ?? [],
  );
};
