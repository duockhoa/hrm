import fs from 'node:fs/promises';
import path from 'node:path';

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });

/** HTML and assets are owned by the backend; values are always plain text. */
export async function renderProductionOrderReportHtml(
  data: Record<string, string>,
) {
  const directory = path.join(process.cwd(), 'templates', 'batch-report');
  const [template, logo, watermark] = await Promise.all([
    fs.readFile(path.join(directory, 'production-order.html'), 'utf8'),
    fs.readFile(path.join(directory, 'logo.png')),
    fs.readFile(path.join(directory, 'logo-removebg.png')),
  ]);
  const values: Record<string, string> = {
    ...data,
    logo_data_uri: `data:image/png;base64,${logo.toString('base64')}`,
    watermark_data_uri: `data:image/png;base64,${watermark.toString('base64')}`,
  };
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    if (!Object.hasOwn(values, key))
      throw new Error(`Unknown batch report field: ${key}`);
    return escapeHtml(values[key]);
  });
}
