import { mkdtemp, rm, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';
import sharp from 'sharp';
import {
  createImageThumbnail,
  getImageThumbnailPath,
  removeImageAndThumbnail,
  resolvePreferredImageFile,
  thumbnailDiskStorage,
} from './image-thumbnail.util';

describe('image thumbnail utilities', () => {
  let temporaryDirectory: string;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'hrm-thumbnail-test-'));
  });

  afterEach(async () => {
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  const createTestImage = async (filename = 'original.jpg') => {
    const imagePath = join(temporaryDirectory, filename);
    await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 3,
        background: '#336699',
      },
    })
      .jpeg()
      .toFile(imagePath);
    return imagePath;
  };

  it('creates a WebP thumbnail whose longest edge is 640px', async () => {
    const imagePath = await createTestImage();
    const thumbnailPath = await createImageThumbnail(imagePath);
    const metadata = await sharp(thumbnailPath).metadata();

    expect(thumbnailPath).toBe(getImageThumbnailPath(imagePath));
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBe(640);
    expect(metadata.height).toBe(427);
  });

  it('prefers the thumbnail and falls back to the original image', async () => {
    const imagePath = await createTestImage();
    const original = await resolvePreferredImageFile(imagePath, 'image/jpeg');

    expect(original?.filePath).toBe(imagePath);
    expect(original?.contentType).toBe('image/jpeg');

    const thumbnailPath = await createImageThumbnail(imagePath);
    const preferred = await resolvePreferredImageFile(imagePath, 'image/jpeg');

    expect(preferred?.filePath).toBe(thumbnailPath);
    expect(preferred?.contentType).toBe('image/webp');
  });

  it('removes the original image and its thumbnail together', async () => {
    const imagePath = await createTestImage();
    const thumbnailPath = await createImageThumbnail(imagePath);

    await removeImageAndThumbnail(imagePath);

    await expect(stat(imagePath)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(stat(thumbnailPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('creates a thumbnail as part of storing a new upload', async () => {
    const imageBuffer = await sharp({
      create: {
        width: 1000,
        height: 500,
        channels: 3,
        background: '#336699',
      },
    })
      .jpeg()
      .toBuffer();
    const storage = thumbnailDiskStorage({
      destination: temporaryDirectory,
      filename: (_request, _file, callback) => callback(null, 'uploaded.jpg'),
    });
    const file = {
      fieldname: 'image',
      originalname: 'uploaded.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      stream: Readable.from(imageBuffer),
    } as Express.Multer.File;

    const info = await new Promise<Partial<Express.Multer.File>>(
      (resolve, reject) => {
        storage._handleFile({} as never, file, (error, storedInfo) => {
          if (error || !storedInfo) {
            reject(
              error instanceof Error
                ? error
                : new Error('Upload storage returned no file info'),
            );
            return;
          }
          resolve(storedInfo);
        });
      },
    );
    const thumbnailPath = getImageThumbnailPath(info.path!);
    const metadata = await sharp(thumbnailPath).metadata();

    expect(info.path).toBe(join(temporaryDirectory, 'uploaded.jpg'));
    expect(metadata.width).toBe(640);
    expect(metadata.height).toBe(320);
  });
});
