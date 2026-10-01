import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const port = Number(app.get(ConfigService).get('PORT', 3000));
  await app.listen(port);
}
bootstrap().catch(error => { console.error(error); process.exitCode = 1; });
