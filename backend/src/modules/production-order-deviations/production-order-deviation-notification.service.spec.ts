import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';
import { EmailSettingsService } from '../email-settings/email-settings.service';
import { EmailService } from '../email/email.service';
import { ProductionOrderDeviationNotificationService } from './production-order-deviation-notification.service';
import {
  buildProductionOrderDeviationEmail,
  type DeviationForEmail,
} from './production-order-deviation-email';
import { PRODUCTION_ORDER_DEVIATION_UPLOAD_DIR } from './production-order-deviation-upload.config';

describe('ProductionOrderDeviationNotificationService', () => {
  const settings = { resolveDefaultRecipients: jest.fn() };
  const email = { sendEmail: jest.fn() };
  const service = new ProductionOrderDeviationNotificationService(
    settings as unknown as EmailSettingsService,
    email as unknown as EmailService,
  );
  const deviation: DeviationForEmail = {
    id: 1,
    production_order_id: 2031,
    deviation_content: 'Nội dung <script>alert(1)</script>\nDòng hai',
    handling_plan: 'Cách ly lô',
    handling_result: null,
    cause: null,
    cause_classification: null,
    affected_quantity: new Prisma.Decimal('0'),
    affected_quantity_unit: 'kg',
    handled_quantity: null,
    handled_quantity_unit: null,
    destroyed_quantity: null,
    destroyed_quantity_unit: null,
    reporter_id: 7,
    approver_id: null,
    created_at: new Date('2026-10-14T03:00:00Z'),
    updated_at: new Date('2026-10-14T03:00:00Z'),
    deleted_at: null,
    productionOrder: {
      id: 2031,
      item_code: 'SP01',
      description: 'Mô tả',
      lot_no: 'L001',
      item: { item_name: 'Sản phẩm & A' },
    },
    reporter: { name: 'Người báo cáo' },
    approver: null,
    images: [],
  };
  let warn: jest.SpyInstance;
  let logError: jest.SpyInstance;

  beforeEach(() => {
    jest.resetAllMocks();
    settings.resolveDefaultRecipients.mockResolvedValue([
      'default@example.com',
    ]);
    email.sendEmail.mockResolvedValue({ status: 'success' });
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    logError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('skips sending when the default email is left blank', async () => {
    settings.resolveDefaultRecipients.mockResolvedValue([]);
    await service.notifyCreated(deviation);
    expect(email.sendEmail).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('no default recipients'),
    );
  });

  it('sends detail fields to the configured default with escaped HTML and Vietnam dates', async () => {
    await service.notifyCreated(deviation);
    expect(settings.resolveDefaultRecipients).toHaveBeenCalledWith(
      'production_order_deviation_created',
    );
    const payload = email.sendEmail.mock.calls[0][0];
    expect(payload.recipients).toEqual(['default@example.com']);
    expect(payload.subject).toBe('Phiếu sai lệch #1 - Sản phẩm & A - Lô L001');
    expect(payload.html).toContain(
      '&lt;script&gt;alert(1)&lt;/script&gt;<br>Dòng hai',
    );
    expect(payload.html).not.toContain('<script>');
    expect(payload.html).toContain('Sản phẩm &amp; A');
    expect(payload.html).toContain('0 kg');
    expect(payload.html).toContain('10:00');
    expect(payload.html).toContain('14/10/2026');
    expect(payload.html).toContain('Không có hình ảnh đính kèm.');
    const attachment = payload.attachments[0];
    expect(attachment.filename).toBe('sai-lech-1.html');
    expect(
      Buffer.from(attachment.contentBase64, 'base64').toString('utf8'),
    ).toContain('Người báo cáo');
  });

  it('embeds a protected uploaded image and includes it in the standalone HTML file', async () => {
    const filename = `email-test-${randomUUID()}.png`;
    const filePath = join(PRODUCTION_ORDER_DEVIATION_UPLOAD_DIR, filename);
    await mkdir(PRODUCTION_ORDER_DEVIATION_UPLOAD_DIR, { recursive: true });
    await writeFile(
      filePath,
      await sharp({
        create: { width: 16, height: 16, channels: 3, background: '#2563eb' },
      })
        .png()
        .toBuffer(),
    );
    try {
      await service.notifyCreated({
        ...deviation,
        images: [
          { image_path: `/production-order-deviations/images/${filename}` },
        ],
      });
      const payload = email.sendEmail.mock.calls[0][0];
      expect(payload.html).toContain('src="cid:deviation_image_1"');
      expect(payload.html).not.toContain(
        '/production-order-deviations/images/',
      );
      const embedded = payload.inlineImages.deviation_image_1;
      expect(embedded.contentType).toBe('image/jpeg');
      expect(
        (await sharp(Buffer.from(embedded.contentBase64, 'base64')).metadata())
          .format,
      ).toBe('jpeg');
      const htmlFile = Buffer.from(
        payload.attachments[0].contentBase64,
        'base64',
      ).toString('utf8');
      expect(htmlFile).toContain(
        `src="data:image/jpeg;base64,${embedded.contentBase64}"`,
      );
      expect(htmlFile).not.toContain('cid:');
    } finally {
      await unlink(filePath);
    }
  });

  it('omits deleted images and shows a placeholder for unavailable or external files', async () => {
    await service.notifyCreated({
      ...deviation,
      images: [
        {
          image_path: '/production-order-deviations/images/deleted.jpg',
          deleted_at: new Date(),
        },
        { image_path: 'https://example.com/private.jpg' },
        { image_path: '/production-order-deviations/images/../secret.jpg' },
      ],
    });
    const payload = email.sendEmail.mock.calls[0][0];
    expect(payload.inlineImages).toEqual({});
    expect(payload.html).toContain('Không thể tải ảnh đính kèm.');
    expect(payload.html).not.toContain('Hình ảnh sai lệch 3');
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('logs provider and configuration failures without failing the committed creation', async () => {
    email.sendEmail.mockRejectedValue(new Error('Provider unavailable'));
    await expect(service.notifyCreated(deviation)).resolves.toBeUndefined();
    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining('#1'),
      expect.stringContaining('Provider unavailable'),
    );
    email.sendEmail.mockClear();
    settings.resolveDefaultRecipients.mockRejectedValue(
      new Error('Configuration unavailable'),
    );
    await expect(service.notifyCreated(deviation)).resolves.toBeUndefined();
    expect(email.sendEmail).not.toHaveBeenCalled();
  });

  it('lays out multiple images in pairs without leaking CID references to the attachment', () => {
    const file = {
      filename: 'image.jpg',
      contentType: 'image/jpeg',
      contentBase64: Buffer.from('bytes').toString('base64'),
    };
    const payload = buildProductionOrderDeviationEmail(
      deviation,
      [1, 2, 3].map((index) => ({
        key: `image_${index}`,
        label: `Ảnh ${index}`,
        file,
      })),
    );
    expect(Object.keys(payload.inlineImages!)).toHaveLength(3);
    expect(payload.html).toContain('cid:image_3');
    const archive = Buffer.from(
      payload.attachments![0].contentBase64,
      'base64',
    ).toString('utf8');
    expect(archive.match(/src="data:image\/jpeg;base64,/g)).toHaveLength(3);
  });
});
