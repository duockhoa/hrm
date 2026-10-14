import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createContext, runInContext } from 'vm';

describe('Apps Script email adapter', () => {
  const script = readFileSync(
    resolve(__dirname, '../../../../apps-script/email.gs'),
    'utf8',
  );
  const sendEmail = jest.fn();
  const sandbox = createContext({
    MailApp: { sendEmail },
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
  beforeEach(() => sendEmail.mockReset());

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
    expect(sendEmail).toHaveBeenCalledWith({
      to: 'a@example.com,b@example.com',
      subject: 'OTP',
      body: 'OTP 123456',
      htmlBody: '<p>123456</p>',
      name: 'App',
    });
  });

  it('decodes images and the HTML attachment into MailApp blobs', () => {
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
    const options = sendEmail.mock.calls[0][0];
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
});
