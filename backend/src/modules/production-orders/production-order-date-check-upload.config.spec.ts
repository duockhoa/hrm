import { getDateCheckUploadStoredFilename } from './production-order-date-check-upload.config';

const requestFileMetadata = (originalname: string) => ({
  fieldname: 'request_file',
  mimetype:
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  originalname,
});

describe('productionOrderDateCheckUploadConfig', () => {
  it('stores Vietnamese request filenames as ASCII URL-safe filenames', () => {
    const filename = getDateCheckUploadStoredFilename(
      requestFileMetadata('Đề nghị kiểm tra ngày.xlsx'),
    );

    expect(filename).toMatch(
      /^De-nghi-kiem-tra-ngay-[0-9a-f-]{36}\.xlsx$/,
    );
    expect(filename).toMatch(/^[\x00-\x7F]+$/);
  });

  it('repairs mojibake request filenames before storing', () => {
    const mojibakeFilename = Buffer.from(
      'Báo cáo kiểm tra.xlsx',
      'utf8',
    ).toString('latin1');

    const filename = getDateCheckUploadStoredFilename(
      requestFileMetadata(mojibakeFilename),
    );

    expect(filename).toMatch(/^Bao-cao-kiem-tra-[0-9a-f-]{36}\.xlsx$/);
    expect(filename).toMatch(/^[\x00-\x7F]+$/);
  });
});
