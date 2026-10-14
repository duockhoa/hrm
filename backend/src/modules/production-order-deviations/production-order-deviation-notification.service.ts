import { Injectable, Logger } from '@nestjs/common';
import { realpath } from 'fs/promises';
import { resolve, sep } from 'path';
import sharp from 'sharp';
import { EMAIL_TYPE_CODES } from '../email-settings/constants/email-settings.constants';
import { EmailSettingsService } from '../email-settings/email-settings.service';
import { EmailService } from '../email/email.service';
import {
  buildProductionOrderDeviationEmail,
  type DeviationEmailImage,
  type DeviationForEmail,
} from './production-order-deviation-email';
import {
  getStoredDeviationImageFilename,
  PRODUCTION_ORDER_DEVIATION_UPLOAD_DIR,
  resolveDeviationImageFile,
} from './production-order-deviation-upload.config';

@Injectable()
export class ProductionOrderDeviationNotificationService {
  private readonly logger = new Logger(
    ProductionOrderDeviationNotificationService.name,
  );

  constructor(
    private readonly emailSettingsService: EmailSettingsService,
    private readonly emailService: EmailService,
  ) {}

  async notifyCreated(deviation: DeviationForEmail): Promise<void> {
    try {
      const recipients =
        await this.emailSettingsService.resolveDefaultRecipients(
          EMAIL_TYPE_CODES.PRODUCTION_ORDER_DEVIATION_CREATED,
        );
      if (!recipients.length) {
        this.logger.warn(
          `Skipped email for deviation #${deviation.id}: no default recipients configured`,
        );
        return;
      }

      const images: DeviationEmailImage[] = [];
      for (const [index, image] of (deviation.images ?? [])
        .filter((image) => !image.deleted_at)
        .entries()) {
        images.push(await this.buildImage(image.image_path, index));
      }
      await this.emailService.sendEmail({
        ...buildProductionOrderDeviationEmail(deviation, images),
        recipients,
      });
    } catch (error) {
      // The deviation and uploads have already been committed. A provider failure
      // must not turn this into a failed create or cause the controller to delete images.
      this.logger.error(
        `Failed to send creation email for deviation #${deviation.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async buildImage(
    imagePath: string,
    index: number,
  ): Promise<DeviationEmailImage> {
    const image: DeviationEmailImage = {
      key: `deviation_image_${index + 1}`,
      label: `Hình ảnh sai lệch ${index + 1}`,
    };
    try {
      const filename = getStoredDeviationImageFilename(imagePath);
      const storedFile = filename
        ? await resolveDeviationImageFile(filename, true)
        : null;
      if (!storedFile) throw new Error('Stored image not found');
      const directory = await realpath(
        resolve(PRODUCTION_ORDER_DEVIATION_UPLOAD_DIR),
      );
      const filePath = await realpath(storedFile.filePath);
      if (!filePath.startsWith(`${directory}${sep}`))
        throw new Error('Invalid image path');

      const buffer = await sharp(filePath)
        .rotate()
        .resize({
          width: 1200,
          height: 1200,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 80 })
        .toBuffer();
      image.file = {
        filename: `${image.key}.jpg`,
        contentType: 'image/jpeg',
        contentBase64: buffer.toString('base64'),
      };
    } catch (error) {
      this.logger.warn(
        `Cannot embed ${imagePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return image;
  }
}
