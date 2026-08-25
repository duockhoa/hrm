import { readdir, stat } from 'fs/promises';
import { resolve } from 'path';
import {
  createImageThumbnail,
  getImageThumbnailPath,
  IMAGE_THUMBNAIL_MAX_SIZE,
  isSupportedImageFilename,
} from '../common/utils/image-thumbnail.util';

const uploadsDirectory = resolve(process.cwd(), 'uploads');
const force = process.argv.includes('--force');
const dryRun = process.argv.includes('--dry-run');
const EXCLUDED_DIRECTORIES = new Set(['request-files']);

const findImageFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    () => [],
  );
  const imageFiles: string[] = [];

  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name);

    if (entry.isDirectory() && !EXCLUDED_DIRECTORIES.has(entry.name)) {
      imageFiles.push(...(await findImageFiles(entryPath)));
    } else if (entry.isFile() && isSupportedImageFilename(entry.name)) {
      imageFiles.push(entryPath);
    }
  }

  return imageFiles;
};

const main = async () => {
  const imageFiles = await findImageFiles(uploadsDirectory);
  let created = 0;
  let skipped = 0;
  let failed = 0;

  console.log(
    `Found ${imageFiles.length} images. Thumbnail max size: ${IMAGE_THUMBNAIL_MAX_SIZE}px.`,
  );

  for (const imagePath of imageFiles) {
    const thumbnailPath = getImageThumbnailPath(imagePath);
    const thumbnailStat = await stat(thumbnailPath).catch(() => null);

    if (!force && thumbnailStat?.isFile()) {
      skipped += 1;
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] ${imagePath}`);
      created += 1;
      continue;
    }

    try {
      await createImageThumbnail(imagePath, { tolerateCorruptInput: true });
      created += 1;
      console.log(`[created] ${thumbnailPath}`);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[failed] ${imagePath}: ${message}`);
    }
  }

  console.log(
    `Done. Created: ${created}, skipped: ${skipped}, failed: ${failed}.`,
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
};

void main();
