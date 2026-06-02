import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ensureProductionOrderDeviationUploadDir } from './modules/production-order-deviations/production-order-deviation-upload.config';

async function bootstrap() {
  ensureProductionOrderDeviationUploadDir();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    exposedHeaders: ['Content-Disposition'],
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
