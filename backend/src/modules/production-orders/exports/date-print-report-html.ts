import { BadRequestException } from '@nestjs/common';
import fs from 'node:fs/promises';
import path from 'node:path';
import PizZip from 'pizzip';
import sharp from 'sharp';
import { datePrintData } from './date-print-export';
import {
  DATE_PRINT_TEMPLATE_IMAGE_ROUTE,
  resolveDatePrintTemplateImageFile,
} from '../../items/date-print-template-image-upload.config';

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]!,
  );

export async function renderDatePrintHtml(
  order: Parameters<typeof datePrintData>[0],
  template: Parameters<typeof datePrintData>[1],
) {
  const data = datePrintData(order, template);
  const directory = path.join(
    process.cwd(),
    'templates/date-coding-work-order-template',
  );
  const [html, word] = await Promise.all([
    fs.readFile(
      path.join(directory, 'date-coding-work-order-template.html'),
      'utf8',
    ),
    fs.readFile(path.join(directory, 'date-coding-work-order-template.docx')),
  ]);
  // Reuse the exact logo embedded in the approved Word template.
  const logo = new PizZip(word).file('word/media/image1.png')!.asNodeBuffer();
  let illustration = '';
  if (template.image_path) {
    const prefix = `${DATE_PRINT_TEMPLATE_IMAGE_ROUTE}/`;
    const file = template.image_path.startsWith(prefix)
      ? await resolveDatePrintTemplateImageFile(
          template.image_path.slice(prefix.length),
          true,
        )
      : null;
    if (!file)
      throw new BadRequestException(
        'Không tìm thấy ảnh minh họa của biểu mẫu in date.',
      );
    const image = await sharp(file.filePath)
      .rotate()
      .resize({
        width: 600,
        height: 280,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();
    illustration = `<img src="data:image/png;base64,${image.toString('base64')}" alt="Ảnh minh họa">`;
  }
  const values: Record<string, string> = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, escapeHtml(value)]),
  );
  values.logo = `data:image/png;base64,${logo.toString('base64')}`;
  values.illustration = illustration;
  return html.replace(/{{(\w+)}}/g, (_, key: string) => values[key] ?? '');
}
