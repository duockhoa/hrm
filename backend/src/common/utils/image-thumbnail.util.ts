import { randomUUID } from 'crypto';
import { readFile, rename, stat, unlink } from 'fs/promises';
import multer, { diskStorage } from 'multer';
import { extname } from 'path';
import sharp from 'sharp';
import { BadRequestException } from '@nestjs/common';

// Upload filenames are unique and may be deleted immediately on a failed save.
// Do not let libvips retain open file handles (which prevent unlink on Windows).
sharp.cache({ files: 0 });

// Collected by the global interceptor, which queues work only after the handler succeeds.
export const UPLOADED_THUMBNAIL_SOURCES = Symbol('uploaded-thumbnail-sources');
export type ThumbnailUploadRequest = {
  [UPLOADED_THUMBNAIL_SOURCES]?: string[];
};

export const IMAGE_THUMBNAIL_MAX_SIZE = 640;
export const IMAGE_THUMBNAIL_QUALITY = 80;
export const IMAGE_THUMBNAIL_SUFFIX = '.thumb.webp';

const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
]);

type ThumbnailDiskStorageOptions = {
  shouldCreateThumbnail?: (file: Express.Multer.File) => boolean;
};

type CreateImageThumbnailOptions = {
  tolerateCorruptInput?: boolean;
};

type ResolveImageFileOptions = {
  preferThumbnail?: boolean;
};

export type ResolvedImageFile = {
  contentType: string;
  filePath: string;
  size: number;
};

export const isSupportedImageFilename = (filename: string) =>
  !filename.endsWith(IMAGE_THUMBNAIL_SUFFIX) &&
  SUPPORTED_IMAGE_EXTENSIONS.has(extname(filename).toLowerCase());

export const getImageThumbnailPath = (originalPath: string) => {
  const extension = extname(originalPath);
  const basePath = extension
    ? originalPath.slice(0, -extension.length)
    : originalPath;

  return `${basePath}${IMAGE_THUMBNAIL_SUFFIX}`;
};

export const createImageThumbnail = async (
  originalPath: string,
  options: CreateImageThumbnailOptions = {},
) => {
  const thumbnailPath = getImageThumbnailPath(originalPath);
  const temporaryPath = `${thumbnailPath}.${randomUUID()}.tmp`;

  try {
    await sharp(originalPath, {
      failOn: options.tolerateCorruptInput ? 'none' : 'error',
    })
      .rotate()
      .resize({
        width: IMAGE_THUMBNAIL_MAX_SIZE,
        height: IMAGE_THUMBNAIL_MAX_SIZE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: IMAGE_THUMBNAIL_QUALITY })
      .toFile(temporaryPath);
    await rename(temporaryPath, thumbnailPath);
    // An upload may be deleted while Sharp is working. Do not resurrect its thumbnail.
    try {
      await stat(originalPath);
    } catch (error) {
      await unlink(thumbnailPath).catch(() => undefined);
      throw error;
    }
    return thumbnailPath;
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
};

export const removeImageAndThumbnail = async (originalPath: string) => {
  await unlink(originalPath).catch(() => undefined);
  await unlink(getImageThumbnailPath(originalPath)).catch(() => undefined);
};

export const resolvePreferredImageFile = async (
  originalPath: string,
  originalContentType: string,
  options: ResolveImageFileOptions = {},
): Promise<ResolvedImageFile | null> => {
  const preferThumbnail = options.preferThumbnail ?? true;

  if (preferThumbnail) {
    const thumbnailPath = getImageThumbnailPath(originalPath);
    const thumbnailStat = await stat(thumbnailPath).catch(() => null);

    if (thumbnailStat?.isFile()) {
      return {
        contentType: 'image/webp',
        filePath: thumbnailPath,
        size: thumbnailStat.size,
      };
    }
  }

  const originalStat = await stat(originalPath).catch(() => null);
  if (!originalStat?.isFile()) {
    return null;
  }

  return {
    contentType: originalContentType,
    filePath: originalPath,
    size: originalStat.size,
  };
};

export const thumbnailDiskStorage = (
  options: multer.DiskStorageOptions,
  thumbnailOptions: ThumbnailDiskStorageOptions = {},
): multer.StorageEngine => {
  const storage = diskStorage(options);
  const shouldCreateThumbnail =
    thumbnailOptions.shouldCreateThumbnail ??
    ((file: Express.Multer.File) =>
      SUPPORTED_IMAGE_MIME_TYPES.has(file.mimetype));

  return {
    _handleFile(request, file, callback) {
      storage._handleFile(request, file, (error, info) => {
        if (error || !info?.path || !shouldCreateThumbnail(file)) {
          callback(error, info);
          return;
        }

        // Decode all pixels to reject corrupt/truncated images, without WebP encoding.
        // Use a buffer for validation so a failed Sharp decode cannot retain a
        // source file handle and prevent the controller/Multer from cleaning up.
        void readFile(info.path)
          .then((bytes) => sharp(bytes, { failOn: 'error' }).stats())
          .then(() => {
            const uploadRequest = request as ThumbnailUploadRequest;
            (uploadRequest[UPLOADED_THUMBNAIL_SOURCES] ??= []).push(info.path!);
            callback(undefined, info);
          })
          .catch(async () => {
            await removeImageAndThumbnail(info.path!);
            callback(new BadRequestException('Invalid or corrupt image'));
          });
      });
    },
    _removeFile(request, file, callback) {
      const thumbnailPath = file.path ? getImageThumbnailPath(file.path) : null;

      storage._removeFile(request, file, (error) => {
        if (!thumbnailPath) {
          callback(error);
          return;
        }

        void unlink(thumbnailPath)
          .catch(() => undefined)
          .then(() => callback(error));
      });
    },
  };
};
