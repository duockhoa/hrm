import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { access } from 'node:fs/promises';
import type { Server } from 'node:http';
import sharp from 'sharp';
import request from 'supertest';
import { PERMISSIONS_KEY } from 'src/decorators/permissions.decorator';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PrismaService } from 'src/prisma.service';
import { getImageThumbnailPath } from 'src/common/utils/image-thumbnail.util';
import {
  removeReceiptAttachments,
  resolveReceiptAttachmentPath,
} from './receipt-attachment-files';
import { WarehouseReceiptAttachmentsController } from './warehouse-receipt-attachments.controller';
import { WarehouseReceiptAttachmentsService } from './warehouse-receipt-attachments.service';

describe('Warehouse receipt attachment API', () => {
  let app: INestApplication<Server>;
  let image: Buffer;
  const paths: string[] = [];
  const attachments = {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  };
  const prisma = {
    warehouseReceiptItemAttachments: attachments,
    warehouseReceiptItems: { findUnique: jest.fn() },
    users: { findFirst: jest.fn() },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };
  let record: Record<string, unknown>;

  beforeAll(async () => {
    image = await sharp({
      create: { width: 8, height: 8, channels: 3, background: '#fff' },
    })
      .png()
      .toBuffer();
    const module = await Test.createTestingModule({
      controllers: [WarehouseReceiptAttachmentsController],
      providers: [
        WarehouseReceiptAttachmentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    })
      .overrideGuard(jwtAuthGuard)
      .useValue({
        canActivate(context: {
          switchToHttp: () => {
            getRequest: () => {
              headers: Record<string, string>;
              user?: { id: number };
            };
          };
        }) {
          const req = context.switchToHttp().getRequest();
          if (req.headers.authorization !== 'Bearer test')
            throw new UnauthorizedException();
          req.user = { id: 7 };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication<INestApplication<Server>>();
    await app.init();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.warehouseReceiptItems.findUnique.mockResolvedValue({ id: 1 });
    prisma.users.findFirst.mockResolvedValue({ id: 7 });
    prisma.$queryRaw.mockResolvedValue([{ id: 1 }]);
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma),
    );
    attachments.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => {
        paths.push(data.file_path as string);
        record = {
          id: 11,
          ...data,
          uploadedBy: { id: 7, username: 'test', name: 'Test uploader' },
        };
        return Promise.resolve(record);
      },
    );
  });

  afterEach(async () => {
    await removeReceiptAttachments(paths.splice(0));
  });
  afterAll(async () => {
    await app.close();
  });

  function upload() {
    return request(app.getHttpServer())
      .post('/warehouse-receipt-items/1/attachments')
      .set('Authorization', 'Bearer test');
  }

  it('uses only JWT and no permission metadata', () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        WarehouseReceiptAttachmentsController,
      ),
    ).toEqual([jwtAuthGuard]);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        WarehouseReceiptAttachmentsController,
      ),
    ).toBeUndefined();
  });

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer())
      .get('/warehouse-receipt-items/1/attachments')
      .expect(401);
  });

  it.each(['dispatch_note', 'coa', 'invoice'])(
    'uploads and serves an actual %s image with a thumbnail',
    async (type) => {
      const response = await upload()
        .field('attachment_type', type)
        .attach('files', image, {
          filename: 'scan.png',
          contentType: 'image/png',
        })
        .expect(201);
      const body = response.body as Array<{
        file_path: string;
        uploaded_by_id: number;
        attachment_type: string;
        original_name: string;
        file_size: number;
      }>;
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({
        attachment_type: type,
        original_name: 'scan.png',
        uploaded_by_id: 7,
        file_size: image.length,
      });
      const diskPath = resolveReceiptAttachmentPath(body[0].file_path)!;
      await expect(access(diskPath)).resolves.toBeUndefined();
      await expect(
        access(getImageThumbnailPath(diskPath)),
      ).resolves.toBeUndefined();
      attachments.findUnique.mockResolvedValue(record);
      await request(app.getHttpServer())
        .get(body[0].file_path)
        .set('Authorization', 'Bearer test')
        .expect(200)
        .expect('Content-Type', /image\/png/);
      await request(app.getHttpServer())
        .get(`${body[0].file_path}?thumbnail=true`)
        .set('Authorization', 'Bearer test')
        .expect(200)
        .expect('Content-Type', /image\/webp/);
      await request(app.getHttpServer()).get(body[0].file_path).expect(401);
    },
  );

  it('supports multiple images in one transaction', async () => {
    const response = await upload()
      .field('attachment_type', 'invoice')
      .attach('files', image, 'one.png')
      .attach('files', image, 'two.png')
      .expect(201);
    expect(response.body).toHaveLength(2);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it.each(['', 'other'])('rejects invalid attachment type %s', async (type) => {
    await upload()
      .field('attachment_type', type)
      .attach('files', image, 'scan.png')
      .expect(400);
    expect(attachments.create).not.toHaveBeenCalled();
  });

  it('rejects missing images and invalid receipt IDs', async () => {
    await upload().field('attachment_type', 'coa').expect(400);
    await request(app.getHttpServer())
      .post('/warehouse-receipt-items/not-a-number/attachments')
      .set('Authorization', 'Bearer test')
      .field('attachment_type', 'coa')
      .attach('files', image, 'scan.png')
      .expect(400);
  });

  it('rejects extra upload fields and user spoofing', async () => {
    await upload()
      .field('attachment_type', 'coa')
      .field('uploaded_by_id', '99')
      .attach('files', image, 'scan.png')
      .expect(400);
    expect(attachments.create).not.toHaveBeenCalled();
  });

  it('rejects corrupt files and mismatched image MIME types', async () => {
    await upload()
      .field('attachment_type', 'coa')
      .attach('files', Buffer.from('not an image'), {
        filename: 'scan.png',
        contentType: 'image/png',
      })
      .expect(400);
    await upload()
      .field('attachment_type', 'coa')
      .attach('files', image, {
        filename: 'scan.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);
    await upload()
      .field('attachment_type', 'coa')
      .attach('files', Buffer.from('<svg/>'), {
        filename: 'scan.svg',
        contentType: 'image/svg+xml',
      })
      .expect(400);
    expect(attachments.create).not.toHaveBeenCalled();
  });

  it('rejects files over 5 MB', async () => {
    await upload()
      .field('attachment_type', 'invoice')
      .attach('files', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'scan.png',
        contentType: 'image/png',
      })
      .expect(413);
  });

  it('rejects more than 10 files', async () => {
    const req = upload().field('attachment_type', 'coa');
    for (let i = 0; i < 11; i++) req.attach('files', image, `scan${i}.png`);
    await req.expect(400);
  });

  it('rejects missing receipts and deleted uploaders', async () => {
    prisma.warehouseReceiptItems.findUnique.mockResolvedValueOnce(null);
    await upload()
      .field('attachment_type', 'coa')
      .attach('files', image, 'scan.png')
      .expect(404);
    prisma.users.findFirst.mockResolvedValueOnce(null);
    await upload()
      .field('attachment_type', 'coa')
      .attach('files', image, 'scan.png')
      .expect(401);
    expect(attachments.create).not.toHaveBeenCalled();
  });

  it('cleans originals and thumbnails when the upload transaction fails', async () => {
    const service = app.get(WarehouseReceiptAttachmentsService);
    // Capture generated paths by rejecting only after the create calls.
    prisma.$transaction.mockImplementationOnce(
      async (callback: (tx: typeof prisma) => Promise<unknown>) => {
        await callback(prisma);
        throw new Error('Simulated transaction failure');
      },
    );
    await expect(
      service.upload(
        1,
        { attachment_type: 'coa' },
        [
          {
            buffer: image,
            mimetype: 'image/png',
            originalname: 'scan.png',
          } as Express.Multer.File,
        ],
        { id: 7 },
      ),
    ).rejects.toThrow('Simulated transaction failure');
    expect(paths).toHaveLength(1);
    const diskPath = resolveReceiptAttachmentPath(paths[0])!;
    await expect(access(diskPath)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(access(getImageThumbnailPath(diskPath))).rejects.toMatchObject(
      { code: 'ENOENT' },
    );
  });

  it('filters the list by type and returns uploader details', async () => {
    attachments.findMany.mockResolvedValue([
      { id: 11, attachment_type: 'coa', uploadedBy: { id: 7 } },
    ]);
    await request(app.getHttpServer())
      .get('/warehouse-receipt-items/1/attachments?attachment_type=coa')
      .set('Authorization', 'Bearer test')
      .expect(200);
    expect(attachments.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { warehouse_receipt_item_id: 1, attachment_type: 'coa' },
      }),
    );
    await request(app.getHttpServer())
      .get('/warehouse-receipt-items/1/attachments?attachment_type=invalid')
      .set('Authorization', 'Bearer test')
      .expect(400);
  });

  it('returns 404 for an attachment belonging to another receipt', async () => {
    attachments.findFirst.mockResolvedValue(null);
    await request(app.getHttpServer())
      .delete('/warehouse-receipt-items/2/attachments/11')
      .set('Authorization', 'Bearer test')
      .expect(404);
    expect(attachments.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 11, warehouse_receipt_item_id: 2 },
      }),
    );
    expect(attachments.delete).not.toHaveBeenCalled();
  });

  it('deletes the attachment record, original and thumbnail', async () => {
    await upload()
      .field('attachment_type', 'invoice')
      .attach('files', image, 'scan.png')
      .expect(201);
    attachments.findFirst.mockResolvedValue(record);
    attachments.delete.mockResolvedValue(record);
    await request(app.getHttpServer())
      .delete('/warehouse-receipt-items/1/attachments/11')
      .set('Authorization', 'Bearer test')
      .expect(200);
    const diskPath = resolveReceiptAttachmentPath(paths[0])!;
    await expect(access(diskPath)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(access(getImageThumbnailPath(diskPath))).rejects.toMatchObject(
      { code: 'ENOENT' },
    );
  });

  it('rejects paths outside the upload directory', () => {
    expect(resolveReceiptAttachmentPath('/etc/passwd')).toBeNull();
    expect(
      resolveReceiptAttachmentPath(
        '/warehouse-receipt-items/attachment-files/../../secret.jpg',
      ),
    ).toBeNull();
  });
});
