import { BadRequestException } from '@nestjs/common';
import type { DatePrintTemplates, ProductionOrders } from '@prisma/client';
import Docxtemplater from 'docxtemplater';
import fs from 'node:fs/promises';
import path from 'node:path';
import PizZip from 'pizzip';
import sharp from 'sharp';
import {
  DATE_PRINT_TEMPLATE_IMAGE_ROUTE,
  resolveDatePrintTemplateImageFile,
} from '../../items/date-print-template-image-upload.config';

export function datePrintParts(value: string | null, label: string) {
  const text = value?.trim() ?? '';
  let day: string, month: string, year: string;
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/);
  const local = text.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (iso) [, year, month, day] = iso;
  else if (local) [, day, month, year] = local;
  else if (/^\d{8}$/.test(text)) {
    if (/^(19|20)\d{6}$/.test(text)) {
      year = text.slice(0, 4);
      month = text.slice(4, 6);
      day = text.slice(6);
    } else {
      day = text.slice(0, 2);
      month = text.slice(2, 4);
      year = text.slice(4);
    }
  } else {
    throw new BadRequestException(
      `${label} cần có ngày, tháng và năm 4 chữ số hợp lệ.`,
    );
  }
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() + 1 !== Number(month) ||
    date.getUTCDate() !== Number(day)
  ) {
    throw new BadRequestException(`${label} không hợp lệ.`);
  }
  return {
    dd: day.padStart(2, '0'),
    mm: month.padStart(2, '0'),
    yy: year.slice(-2),
    yyyy: year,
  };
}

export function datePrintData(
  order: ProductionOrders & { item: { item_name: string } },
  template: DatePrintTemplates,
  note = '',
) {
  const mfg = datePrintParts(order.date_manufacture, 'Ngày sản xuất');
  const exp = datePrintParts(order.expire_date, 'Hạn dùng');
  const variables: Record<string, string> = {
    mfg_dd: mfg.dd,
    mfg_mm: mfg.mm,
    mfg_yy: mfg.yy,
    mfg_yyyy: mfg.yyyy,
    exp_dd: exp.dd,
    exp_mm: exp.mm,
    exp_yy: exp.yy,
    exp_yyyy: exp.yyyy,
    manufacturing_date: `${mfg.dd}/${mfg.mm}/${mfg.yyyy}`,
    expiry_date: `${exp.dd}/${exp.mm}/${exp.yyyy}`,
    batch_number: order.lot_no,
  };
  const render = (value: string) => value.replace(
    /{{\s*([^{}]+?)\s*}}/g,
    (_, key: string) => {
      if (!Object.prototype.hasOwnProperty.call(variables, key)) {
        throw new BadRequestException(
          `Biến nội dung in không được hỗ trợ: {{${key}}}`,
        );
      }
      return variables[key];
    },
  );
  return {
    item_name: order.item.item_name,
    note,
    item_code: order.item_code,
    lot_no: order.lot_no,
    date_manufacture: template.manufacturing_date_format?.trim()
      ? render(template.manufacturing_date_format) : `${mfg.dd}${mfg.mm}${mfg.yy}`,
    expire_date: template.expiry_date_format?.trim()
      ? render(template.expiry_date_format) : `${exp.dd}${exp.mm}${exp.yy}`,
    required_print_content: render(template.print_content),
    print_position_description: template.print_position ?? '',
  };
}

export async function exportDatePrint(
  order: ProductionOrders & { item: { item_name: string } },
  template: DatePrintTemplates,
  note = '',
) {
  const data = datePrintData(order, template, note);
  const source = await fs.readFile(
    path.join(
      process.cwd(),
      'templates',
      'date-coding-work-order-template',
      'date-coding-work-order-template.docx',
    ),
  );
  const doc = new Docxtemplater(new PizZip(source), {
    delimiters: { start: '{{', end: '}}' },
    paragraphLoop: true,
    linebreaks: true,
  });
  doc.render(data);
  const zip = doc.getZip();
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
    const { data: image, info } = await sharp(file.filePath)
      .rotate()
      .resize({
        width: 1800,
        height: 1200,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png()
      .toBuffer({ resolveWithObject: true });
    zip.file('word/media/date-print-example.png', image);
    const relPath = 'word/_rels/document.xml.rels';
    zip.file(
      relPath,
      zip
        .file(relPath)!
        .asText()
        .replace(
          '</Relationships>',
          '<Relationship Id="rIdDatePrintExample" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/date-print-example.png"/></Relationships>',
        ),
    );
    const types = zip.file('[Content_Types].xml')!.asText();
    zip.file(
      '[Content_Types].xml',
      types.replace(
        '</Types>',
        '<Override PartName="/word/media/date-print-example.png" ContentType="image/png"/></Types>',
      ),
    );
    // Fit the image into the Word illustration cell, independently of pixel density.
    const scale = Math.min((456 * 12700) / info.width, (280 * 12700) / info.height);
    const cx = Math.round(info.width * scale),
      cy = Math.round(info.height * scale);
    const drawing = `<w:p><w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="99001" name="Date print example"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="99001" name="date-print-example.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rIdDatePrintExample"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
    const xml = zip.file('word/document.xml')!.asText();
    // The final table cell in the supplied Word template is the illustration box.
    const imageCellEnd = xml.lastIndexOf('</w:tc>');
    if (imageCellEnd < 0) {
      throw new BadRequestException('Mẫu Word thiếu ô chứa ảnh minh họa.');
    }
    const cellStart = xml.lastIndexOf('<w:tc>', imageCellEnd);
    const propertiesEnd = xml.indexOf('</w:tcPr>', cellStart) + '</w:tcPr>'.length;
    const cellProperties = xml.slice(cellStart, propertiesEnd).replace('</w:tcPr>', '<w:vAlign w:val="center"/></w:tcPr>');
    const centeredDrawing = drawing.replace('<w:p>', '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>');
    zip.file('word/document.xml', xml.slice(0, cellStart) + cellProperties + centeredDrawing + xml.slice(imageCellEnd));
  }
  return {
    buffer: zip.generate({
      compression: 'DEFLATE',
      type: 'nodebuffer',
    }) as Buffer,
    contentType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    filename: `Theo-doi-in-date-${order.id}-v${template.version}.docx`,
  };
}
