import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { chromium } from 'playwright';
import type { Browser } from 'playwright';

/** Only local, server-generated HTML templates are accepted by this renderer. */
@Injectable()
export class ProductionOrderPdfRendererService {
  private readonly logger = new Logger(ProductionOrderPdfRendererService.name);
  private rendering = false;

  async render(html: string): Promise<Buffer> {
    // Bound memory usage on this API process; callers can retry a busy export.
    if (this.rendering) {
      throw new ServiceUnavailableException(
        'Đang xuất báo cáo khác. Vui lòng thử lại sau.',
      );
    }
    this.rendering = true;
    let browser: Browser | undefined;
    let timer: NodeJS.Timeout | undefined;
    try {
      browser = await chromium.launch({ headless: true, timeout: 60_000 });
      const page = await browser.newPage({ javaScriptEnabled: false });
      page.setDefaultTimeout(60_000);
      // No URLs from document contents may access the network or local files, except for web fonts.
      await page.route('**/*', (route) => {
        const url = route.request().url();
        if (url.startsWith('https://fonts.cdnfonts.com/')) {
          return route.continue();
        }
        return route.abort();
      });
      const task = async () => {
        await page.emulateMedia({ media: 'print' });
        await page.setContent(html, { waitUntil: 'load' });
        const layout = await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(
            Array.from(document.images).map((image) => image.decode()),
          );
          const sections =
            Array.from(document.querySelectorAll<HTMLElement>('.report-page'));
          if (sections.length === 0) return null;
          
          // Inject dynamic page numbers
          sections.forEach((section, index) => {
            const footer = section.querySelector<HTMLElement>('.page-footer');
            if (footer) {
              const pageNum = document.createElement('span');
              pageNum.textContent = `Page ${index + 1} of ${sections.length}`;
              footer.appendChild(pageNum);
              footer.style.display = 'flex';
              footer.style.justifyContent = 'space-between';
              footer.style.width = 'calc(100% - 25.4mm)';
            }
          });

          let overflows = false;
          for (const section of sections) {
            const bounds = section.getBoundingClientRect();
            const styles = getComputedStyle(section);
            const maxHeight = parseFloat(styles.minHeight);
            if (!Number.isFinite(maxHeight) || maxHeight <= 0) return null;
            const bottom =
              bounds.top + maxHeight - parseFloat(styles.paddingBottom);
            const sectionOverflows =
              bounds.height > maxHeight + 1 ||
              Array.from(section.querySelectorAll('table, td, p, img')).some(
                (element) => {
                  const rect = element.getBoundingClientRect();
                  return (
                    rect.bottom > bottom + 1 ||
                    rect.right > bounds.right + 1 ||
                    rect.left < bounds.left - 1
                  );
                },
              );
            if (sectionOverflows) overflows = true;
          }
          return { overflows };
        });
        if (!layout || layout.overflows) {
          throw new UnprocessableEntityException(
            'Nội dung lệnh sản xuất bị tràn trang. Vui lòng kiểm tra độ dài dữ liệu hoặc mẫu xuất.',
          );
        }
        return page.pdf({ printBackground: true, preferCSSPageSize: true });
      };
      return await Promise.race([
        task(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('PDF rendering timed out')),
            30_000,
          );
        }),
      ]);
    } catch (error) {
      if (error instanceof UnprocessableEntityException) throw error;
      this.logger.error(
        'Không thể tạo PDF báo cáo lô',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Không thể tạo PDF báo cáo lô. Vui lòng kiểm tra Chromium trên máy chủ hoặc thử lại sau.',
      );
    } finally {
      if (timer) clearTimeout(timer);
      try {
        await browser?.close();
      } finally {
        this.rendering = false;
      }
    }
  }
}
