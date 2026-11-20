import { BadGatewayException, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from 'src/prisma.service';
import { WarehouseReceiptItemsService } from './warehouse-receipt-items.service';

jest.mock('axios');

describe('Warehouse receipt quarantine label', () => {
  const originalApiUrl = process.env.WAREHOUSE_QUARANTINE_LABEL_API_URL;
  afterEach(() => {
    if (originalApiUrl === undefined)
      delete process.env.WAREHOUSE_QUARANTINE_LABEL_API_URL;
    else process.env.WAREHOUSE_QUARANTINE_LABEL_API_URL = originalApiUrl;
  });
  const prisma = {
    warehouseReceiptItems: { findUnique: jest.fn() },
    users: { findFirst: jest.fn() },
  };
  const service = new WarehouseReceiptItemsService(
    prisma as unknown as PrismaService,
  );
  const post = jest.spyOn(axios, 'post');

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.WAREHOUSE_QUARANTINE_LABEL_API_URL =
      ' https://script.google.com/macros/s/test-quarantine-label/exec ';
    prisma.warehouseReceiptItems.findUnique.mockResolvedValue({
      item_code: 'NL001',
      item: { item_name: 'Paracetamol DC 90%' },
      lot_number: 'LOT-20261120',
      expiry_date: new Date('2028-11-20T00:00:00Z'),
      enteredBy: { name: 'Người nhập khác' },
    });
    prisma.users.findFirst.mockResolvedValue({ name: ' Mai Trọng Đạt ' });
    post.mockResolvedValue({ data: { status: 'success' } });
  });

  it('fills the authenticated operator sheet with receipt data and dd/MM/yyyy expiry', async () => {
    await expect(service.createQuarantineLabel(1, 5)).resolves.toEqual({
      status: 'success',
      user_name: 'Mai Trọng Đạt',
    });
    expect(prisma.users.findFirst).toHaveBeenCalledWith({
      where: { id: 5, deleted_at: null },
      select: { name: true },
    });
    expect(post).toHaveBeenCalledWith(
      'https://script.google.com/macros/s/test-quarantine-label/exec',
      {
        material_name: 'Paracetamol DC 90%',
        batch_number: 'LOT-20261120',
        material_code: 'NL001',
        expiry_date: '20/11/2028',
        user_name: 'Mai Trọng Đạt',
      },
      expect.objectContaining({ timeout: 30000 }),
    );
  });

  it('does not send if the endpoint is not configured', async () => {
    delete process.env.WAREHOUSE_QUARANTINE_LABEL_API_URL;
    await expect(service.createQuarantineLabel(1, 5)).rejects.toThrow(
      'WAREHOUSE_QUARANTINE_LABEL_API_URL is not configured',
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('sends an empty expiry when none is recorded', async () => {
    prisma.warehouseReceiptItems.findUnique.mockResolvedValue({
      item_code: 'NL001',
      lot_number: 'L01',
      expiry_date: null,
    });
    await service.createQuarantineLabel(1, 5);
    expect(post.mock.calls[0][1]).toMatchObject({
      expiry_date: '',
      material_name: '',
    });
  });

  it('reports Apps Script errors even for HTTP 200', async () => {
    post.mockResolvedValue({
      data: { status: 'error', message: 'Sheet not found' },
    });
    await expect(service.createQuarantineLabel(1, 5)).rejects.toThrow(
      'Sheet not found',
    );
  });

  it('rejects HTML login pages instead of reporting success', async () => {
    post.mockResolvedValue({ data: '<html>Login</html>' });
    await expect(service.createQuarantineLabel(1, 5)).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('reports network failure without retrying the external write', async () => {
    post.mockRejectedValue(new Error('timeout'));
    await expect(service.createQuarantineLabel(1, 5)).rejects.toThrow(
      'kiểm tra sheet',
    );
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('does not send when the receipt is missing or outside the database scope', async () => {
    prisma.warehouseReceiptItems.findUnique.mockResolvedValue(null);
    await expect(service.createQuarantineLabel(1, 5)).rejects.toThrow(
      NotFoundException,
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('does not send when the operator has no sheet name', async () => {
    prisma.users.findFirst.mockResolvedValue({ name: ' ' });
    await expect(service.createQuarantineLabel(1, 5)).rejects.toThrow(
      'chưa có họ tên',
    );
    expect(post).not.toHaveBeenCalled();
  });
});
