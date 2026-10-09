import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { memoryStorage } from 'multer';
import sharp from 'sharp';
import {
  createImageThumbnail,
  removeImageAndThumbnail,
  resolvePreferredImageFile,
} from 'src/common/utils/image-thumbnail.util';

export const RECEIPT_ATTACHMENT_ROUTE =
  '/warehouse-receipt-items/attachment-files';
export const RECEIPT_ATTACHMENT_DIR = resolve(
  process.cwd(),
  'uploads',
  'warehouse-receipt-items',
);
export const RECEIPT_ATTACHMENT_TYPES = [
  'dispatch_note',
  'coa',
  'invoice',
] as const;
export const MAX_RECEIPT_ATTACHMENT_FILES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const formats = {
  'image/jpeg': { format: 'jpeg', extension: '.jpg' },
  'image/png': { format: 'png', extension: '.png' },
  'image/webp': { format: 'webp', extension: '.webp' },
  'image/gif': { format: 'gif', extension: '.gif' },
} as const;

export const receiptAttachmentUploadOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_RECEIPT_ATTACHMENT_FILES,
    fields: 1,
    fieldSize: 100,
  },
  fileFilter: (
    _request: unknown,
    file: Express.Multer.File,
    callback: (error: Error | null, accept: boolean) => void,
  ) => {
    callback(
      Object.hasOwn(formats, file.mimetype)
        ? null
        : new BadRequestException('files must be JPG, PNG, WEBP or GIF images'),
      Object.hasOwn(formats, file.mimetype),
    );
  },
};

export function resolveReceiptAttachmentPath(filePath: string) {
  const filename = filePath.slice(RECEIPT_ATTACHMENT_ROUTE.length + 1);
  if (
    !filePath.startsWith(`${RECEIPT_ATTACHMENT_ROUTE}/`) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif)$/.test(
      filename,
    )
  ) {
    return null;
  }
  return resolve(RECEIPT_ATTACHMENT_DIR, filename);
}

export async function validateReceiptAttachment(file: Express.Multer.File) {
  const format = formats[file.mimetype as keyof typeof formats];
  if (!format || !file.buffer?.length || file.buffer.length > MAX_FILE_SIZE) {
    throw new BadRequestException('Invalid image or image exceeds 5 MB');
  }
  let detected: string | undefined;
  try {
    detected = (await sharp(file.buffer).metadata()).format;
  } catch {
    throw new BadRequestException('File content is not a valid image');
  }
  if (detected !== format.format)
    throw new BadRequestException('Image content does not match MIME type');
  if (!file.originalname || [...file.originalname].length > 255) {
    throw new BadRequestException(
      'Original filename must be between 1 and 255 characters',
    );
  }
}

export async function storeReceiptAttachment(file: Express.Multer.File) {
  const format = formats[file.mimetype as keyof typeof formats];
  const filePath = `${RECEIPT_ATTACHMENT_ROUTE}/${randomUUID()}${format.extension}`;
  const diskPath = resolveReceiptAttachmentPath(filePath)!;
  await mkdir(RECEIPT_ATTACHMENT_DIR, { recursive: true });
  try {
    await writeFile(diskPath, file.buffer, { flag: 'wx' });
    await createImageThumbnail(diskPath);
    return filePath;
  } catch (error) {
    await removeImageAndThumbnail(diskPath);
    throw error;
  }
}

export async function removeReceiptAttachments(filePaths: string[]) {
  await Promise.all(
    filePaths.map(async (filePath) => {
      const diskPath = resolveReceiptAttachmentPath(filePath);
      if (diskPath) await removeImageAndThumbnail(diskPath);
    }),
  );
}

export async function resolveReceiptAttachmentFile(
  filePath: string,
  mimeType: string,
  thumbnail = false,
) {
  const diskPath = resolveReceiptAttachmentPath(filePath);
  return diskPath
    ? resolvePreferredImageFile(diskPath, mimeType, {
        preferThumbnail: thumbnail,
      })
    : null;
}
