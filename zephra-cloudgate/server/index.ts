import 'reflect-metadata';
import * as dotenv from 'dotenv';
import express from 'express';
import * as fs from 'fs';
import * as http from 'http';
import * as next from 'next';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './backend/app.module';
import { HttpExceptionFilter } from './backend/shared/filters/http-exception.filter';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || process.env.FRONTEND_PORT || 3000);
const uploadsDir = path.resolve(process.cwd(), process.env.UPLOADS_DIR || 'uploads');

async function bootstrap() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const server = express();
  const apiServer = express();
  const nextApp = next.default({ dev, hostname, port });
  const nextHandler = nextApp.getRequestHandler();

  await nextApp.prepare();

  const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(apiServer), {
    logger: ['error', 'warn', 'log'],
  });
  nestApp.useGlobalFilters(new HttpExceptionFilter());
  nestApp.setGlobalPrefix('v1');
  await nestApp.init();

  server.use('/uploads', express.static(uploadsDir));
  server.use('/api', apiServer);
  server.all(/.*/, (req, res) => nextHandler(req, res));

  http.createServer(server).listen(port, hostname, () => {
    console.log(`Zephra CloudGate running at http://${hostname}:${port}`);
    console.log('API available under /api/v1');
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start Zephra CloudGate', error);
  process.exit(1);
});
