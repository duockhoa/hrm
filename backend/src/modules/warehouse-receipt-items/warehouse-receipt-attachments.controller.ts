import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  Res,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { createReadStream } from 'node:fs';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import {
  MAX_RECEIPT_ATTACHMENT_FILES,
  RECEIPT_ATTACHMENT_TYPES,
  receiptAttachmentUploadOptions,
} from './receipt-attachment-files';
import { WarehouseReceiptAttachmentsService } from './warehouse-receipt-attachments.service';

@ApiTags('warehouse-receipt-items')
@UseGuards(jwtAuthGuard)
@Controller('warehouse-receipt-items')
export class WarehouseReceiptAttachmentsController {
  constructor(private readonly service: WarehouseReceiptAttachmentsService) {}

  @Get('attachment-files/:filename')
  @ApiQuery({ name: 'thumbnail', required: false, type: Boolean })
  async findFile(
    @Param('filename') filename: string,
    @Query('thumbnail') thumbnail: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.service.findFile(filename, thumbnail === 'true');
    response.set({
      'Cache-Control': 'private, max-age=300',
      'Content-Length': file.size,
      'Content-Type': file.contentType,
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(createReadStream(file.filePath));
  }

  @Get(':id/attachments')
  @ApiQuery({
    name: 'attachment_type',
    required: false,
    enum: RECEIPT_ATTACHMENT_TYPES,
  })
  findAll(
    @Param('id', ParseIntPipe) id: number,
    @Query('attachment_type') type?: string,
  ) {
    return this.service.findAll(id, type);
  }

  @Get(':id/attachments/:attachmentId')
  findById(
    @Param('id', ParseIntPipe) id: number,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
  ) {
    return this.service.findById(id, attachmentId);
  }

  @Post(':id/attachments')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['attachment_type', 'files'],
      properties: {
        attachment_type: {
          type: 'string',
          enum: [...RECEIPT_ATTACHMENT_TYPES],
        },
        files: {
          type: 'array',
          minItems: 1,
          maxItems: MAX_RECEIPT_ATTACHMENT_FILES,
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor(
      'files',
      MAX_RECEIPT_ATTACHMENT_FILES,
      receiptAttachmentUploadOptions,
    ),
  )
  upload(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @Request() request: { user: { id: number } },
  ) {
    return this.service.upload(id, body, files, request.user);
  }

  @Delete(':id/attachments/:attachmentId')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
  ) {
    return this.service.delete(id, attachmentId);
  }
}
