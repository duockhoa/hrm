import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createContext, runInContext } from 'vm';
import {
  buildProductionOrderDeviationEmail,
  type DeviationForEmail,
} from '../production-order-deviations/production-order-deviation-email';

describe('Apps Script email adapter', () => {
  const script = readFileSync(
    resolve(__dirname, '../../../../apps-script/email.gs'),
    'utf8',
  );
  const sendEmail = jest.fn();
  const getAliases = jest.fn();
  const sandbox = createContext({
    GmailApp: { sendEmail, getAliases },
    Utilities: {
      base64Decode: (value: string) => Array.from(Buffer.from(value, 'base64')),
      newBlob: (bytes: number[], contentType: string, filename: string) => ({
        bytes,
        contentType,
        filename,
      }),
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (value: string) => ({
        setMimeType: () => JSON.parse(value),
      }),
    },
  });
  runInContext(script, sandbox);
  const post = (payload: unknown) => {
    sandbox.request = { postData: { contents: JSON.stringify(payload) } };
    return runInContext('doPost(request)', sandbox);
  };
  beforeEach(() => {
    sendEmail.mockReset();
    getAliases.mockReset().mockReturnValue([]);
  });

  it('authorizes Gmail without sending a test email', () => {
    runInContext('authorizeGmail()', sandbox);
    expect(getAliases).toHaveBeenCalledTimes(1);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('keeps existing text and HTML emails working', () => {
    expect(
      post({
        recipients: 'a@example.com,b@example.com',
        subject: 'OTP',
        message: 'OTP 123456',
        html: '<p>123456</p>',
        senderName: 'App',
      }),
    ).toMatchObject({ status: 'success' });
    expect(sendEmail).toHaveBeenCalledWith(
      'a@example.com,b@example.com',
      'OTP',
      'OTP 123456',
      {
        htmlBody: '<p>123456</p>',
        name: 'App',
      },
    );
  });

  it('decodes images and the HTML attachment into GmailApp blobs', () => {
    const contents = Buffer.from('<p>Sai lệch</p>', 'utf8');
    const file = {
      filename: 'detail.html',
      contentType: 'text/html',
      contentBase64: contents.toString('base64'),
    };
    const image = {
      filename: 'image.jpg',
      contentType: 'image/jpeg',
      contentBase64: Buffer.from('image bytes').toString('base64'),
    };
    expect(
      post({
        recipients: ['default@example.com'],
        subject: 'Sai lệch',
        html: '<img src="cid:image_1">',
        inlineImages: { image_1: image },
        attachments: [file],
      }),
    ).toMatchObject({ status: 'success' });
    const options = sendEmail.mock.calls[0][3];
    expect(options.inlineImages.image_1).toMatchObject({
      filename: 'image.jpg',
      contentType: 'image/jpeg',
    });
    expect(Buffer.from(options.attachments[0].bytes).toString('utf8')).toBe(
      '<p>Sai lệch</p>',
    );
  });

  it('returns provider errors and never sends invalid files', () => {
    expect(
      post({
        recipients: ['default@example.com'],
        subject: 'Sai lệch',
        html: '<p>Chi tiết</p>',
        attachments: [{ filename: '../detail.html' }],
      }),
    ).toMatchObject({ status: 'error' });
    expect(sendEmail).not.toHaveBeenCalled();
    sendEmail.mockImplementation(() => {
      throw new Error('Quota exceeded');
    });
    expect(
      post({
        recipients: ['default@example.com'],
        subject: 'Sai lệch',
        message: 'Chi tiết',
      }),
    ).toMatchObject({ status: 'error', message: 'Quota exceeded' });
  });

  it('delivers every CID in the generated deviation email, including the DKPHARMA logo', () => {
    const deviation = {
      id: 42,
      production_order_id: 12,
      deviation_content: 'Sai lệch mới',
      productionOrder: {
        id: 12,
        item_code: 'SP01',
        description: 'Sản phẩm',
        lot_no: 'L001',
      },
      created_at: new Date('2026-10-14T03:00:00Z'),
      updated_at: new Date('2026-10-14T03:00:00Z'),
    } as DeviationForEmail;
    const image = {
      filename: 'image.jpg',
      contentType: 'image/jpeg',
      contentBase64: Buffer.from('JPEG bytes').toString('base64'),
    };
    const logo = {
      file: {
        filename: 'dkpharma-logo.png',
        contentType: 'image/png',
        contentBase64: readFileSync(
          resolve(
            __dirname,
            '../../../templates/batch-report/logo-removebg.png',
          ),
        ).toString('base64'),
      },
    };
    const payload = buildProductionOrderDeviationEmail(
      deviation,
      [{ key: 'deviation_image_1', label: 'Ảnh 1', file: image }],
      logo,
    );
    expect(
      post({ ...payload, recipients: ['default@example.com'] }),
    ).toMatchObject({ status: 'success' });
    const options = sendEmail.mock.calls[0][3];
    const cids = Array.from(
      payload.html!.matchAll(/src="cid:([^"]+)"/g),
      (match) => match[1],
    );
    expect(cids.sort()).toEqual(['deviation_image_1', 'dkpharma_logo']);
    for (const cid of cids) {
      expect(
        Buffer.from(options.inlineImages[cid].bytes).toString('base64'),
      ).toBe(payload.inlineImages![cid].contentBase64);
    }
    expect(payload.attachments).toBeUndefined();
    expect(options.attachments).toBeUndefined();
    expect(options.htmlBody).not.toContain('https://');
  });
});
