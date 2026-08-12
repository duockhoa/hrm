import 'dotenv/config';
import { createServer } from 'node:http';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ensureProductionOrderDeviationUploadDir } from './modules/production-order-deviations/production-order-deviation-upload.config';

async function bootstrap() {
  ensureProductionOrderDeviationUploadDir();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    exposedHeaders: ['Content-Disposition'],
  });

  const swaggerDocumentConfig = new DocumentBuilder()
    .setTitle('HRM API')
    .setDescription('API documentation for the HRM backend')
    .setVersion('1.0')
    .addBearerAuth()
    .addSecurityRequirements('bearer')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(
    app,
    swaggerDocumentConfig,
    { deepScanRoutes: true },
  );
  SwaggerModule.setup('api-docs', app, swaggerDocument, {
    jsonDocumentUrl: 'api-docs-json',
    yamlDocumentUrl: 'api-docs-yaml',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const apiPort = Number(process.env.PORT) || 3000;
  const swaggerPort = Number(process.env.SWAGGER_PORT) || 50000;

  await app.listen(apiPort);

  if (swaggerPort !== apiPort) {
    const swaggerServer = createServer(app.getHttpAdapter().getInstance());

    await new Promise<void>((resolve, reject) => {
      swaggerServer.once('error', reject);
      swaggerServer.listen(swaggerPort, resolve);
    });
  }

  console.log(`Swagger UI: http://localhost:${swaggerPort}/api-docs`);
}
bootstrap();
