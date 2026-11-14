import {
  Controller,
  INestApplication,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { mkdtemp, readdir, rm, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import request from 'supertest';
import sharp from 'sharp';
import {
  getImageThumbnailPath,
  removeImageAndThumbnail,
  thumbnailDiskStorage,
} from '../utils/image-thumbnail.util';
import {
  ThumbnailProcessingModule,
  ThumbnailProcessingService,
} from './thumbnail-processing.module';

let directory: string;
const save = jest.fn();
const processing = { enqueue: jest.fn().mockResolvedValue(undefined) };
const storage = thumbnailDiskStorage({
  destination: (_req, _file, callback) => callback(null, directory),
});

@Controller('thumbnail-upload-test')
class UploadController {
  @Post()
  @UseInterceptors(FilesInterceptor('images', 10, { storage }))
  async upload(@UploadedFiles() files: Express.Multer.File[]) {
    try {
      await save();
      return { saved: true, paths: files.map((file) => file.path) };
    } catch (error) {
      await Promise.all(
        files.map((file) => removeImageAndThumbnail(file.path)),
      );
      throw error;
    }
  }
}

describe('background thumbnail upload lifecycle over HTTP', () => {
  let app: INestApplication;
  let image: Buffer;
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'hrm-thumbnail-http-'));
    image = await sharp({
      create: { width: 1000, height: 500, channels: 3, background: '#336699' },
    })
      .jpeg()
      .toBuffer();
    const module = await Test.createTestingModule({
      imports: [ThumbnailProcessingModule],
      controllers: [UploadController],
    })
      .overrideProvider(ThumbnailProcessingService)
      .useValue(processing)
      .compile();
    app = module.createNestApplication();
    app.useLogger(false);
    await app.init();
  });
  beforeEach(async () => {
    jest.clearAllMocks();
    save.mockResolvedValue(undefined);
    for (const file of await readdir(directory))
      await removeImageAndThumbnail(join(directory, file));
  });
  afterAll(async () => {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  });

  it('queues only after database success and returns before thumbnail creation', async () => {
    save.mockImplementation(async () => {
      expect(processing.enqueue).not.toHaveBeenCalled();
    });
    const response = await request(app.getHttpServer())
      .post('/thumbnail-upload-test')
      .attach('images', image, {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    const path = response.body.paths[0];
    expect(save).toHaveBeenCalledTimes(1);
    expect(processing.enqueue).toHaveBeenCalledWith([path]);
    await expect(stat(path)).resolves.toMatchObject({ size: image.length });
    await expect(stat(getImageThumbnailPath(path))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('rejects invalid image bytes and does not save or queue them', async () => {
    await request(app.getHttpServer())
      .post('/thumbnail-upload-test')
      .attach('images', Buffer.from('not an image'), {
        filename: 'fake.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);
    expect(save).not.toHaveBeenCalled();
    expect(processing.enqueue).not.toHaveBeenCalled();
    expect(await readdir(directory)).toEqual([]);
  });

  it('rejects truncated images even when the image header is readable', async () => {
    const truncated = image.subarray(0, Math.floor(image.length * 0.7));
    await request(app.getHttpServer())
      .post('/thumbnail-upload-test')
      .attach('images', truncated, {
        filename: 'truncated.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);
    expect(save).not.toHaveBeenCalled();
    expect(processing.enqueue).not.toHaveBeenCalled();
    expect(await readdir(directory)).toEqual([]);
  });

  it('cleans all multipart files if one image is invalid', async () => {
    await request(app.getHttpServer())
      .post('/thumbnail-upload-test')
      .attach('images', image, {
        filename: 'valid.jpg',
        contentType: 'image/jpeg',
      })
      .attach('images', Buffer.from('invalid'), {
        filename: 'invalid.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);
    expect(save).not.toHaveBeenCalled();
    expect(processing.enqueue).not.toHaveBeenCalled();
    expect(await readdir(directory)).toEqual([]);
  });

  it('does not queue failed database saves and preserves upload cleanup', async () => {
    save.mockRejectedValue(new Error('database unavailable'));
    await request(app.getHttpServer())
      .post('/thumbnail-upload-test')
      .attach('images', image, {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      })
      .expect(500);
    expect(processing.enqueue).not.toHaveBeenCalled();
    expect(await readdir(directory)).toEqual([]);
  });
});
