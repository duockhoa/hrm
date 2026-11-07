import 'dotenv/config';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ensureProductionOrderDeviationUploadDir } from './modules/production-order-deviations/production-order-deviation-upload.config';
import { enrichOpenApiDocument } from './swagger/enrich-openapi-document';
import { createProxyTrust } from './modules/network-policies/client-ip';

async function bootstrap() {
  ensureProductionOrderDeviationUploadDir();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, 'swagger', 'assets'), {
    prefix: '/api-docs-assets/',
    index: false,
  });
  app.set('trust proxy', createProxyTrust());
  app.enableCors({
    exposedHeaders: [
      'Content-Disposition',
      'WWW-Authenticate',
      'MCP-Protocol-Version',
    ],
  });

  const swaggerDocumentConfig = new DocumentBuilder()
    .setTitle('DKPHARMA APP API')
    .setDescription(
      'Tài liệu API cho ứng dụng DKPHARMA APP. Liên hệ: tel:0965155761 .',
    )
    .setVersion('1.0.0')
    .addServer(process.env.SWAGGER_API_URL?.trim() || '/')
    .addBearerAuth()
    .addSecurityRequirements('bearer')
    .build();
  const swaggerDocument = enrichOpenApiDocument(
    SwaggerModule.createDocument(app, swaggerDocumentConfig, {
      deepScanRoutes: true,
    }),
  );
  SwaggerModule.setup('api-docs', app, swaggerDocument, {
    customSiteTitle: 'DK Pharma — API Reference',
    customfavIcon: '/api-docs-assets/favicon.ico',
    customCss: `
      .swagger-ui .topbar { background: #fff; border-bottom: 1px solid #e5e7eb; }
      .swagger-ui .topbar .link { max-width: 200px; }
      .swagger-ui .topbar .link img { width: 200px; height: 48px; object-fit: contain; }
    `,
    customJsStr: `
      (() => {
        const observer = new MutationObserver(updateLogo);
        function updateLogo() {
          const link = document.querySelector('.swagger-ui .topbar .link');
          if (!link) return;
          observer.disconnect();
          const logo = document.createElement('img');
          logo.src = '/api-docs-assets/logo.png';
          logo.alt = 'DK Pharma';
          link.replaceChildren(logo);
          link.setAttribute('href', '/api-docs');
          link.setAttribute('aria-label', 'DK Pharma API Reference');
          link.removeAttribute('target');
        }
        observer.observe(document.documentElement, { childList: true, subtree: true });
        updateLogo();
      })();
    `,
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
