import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import serverlessExpress from '@codegenie/serverless-express';
import type { Handler } from 'aws-lambda';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

let cachedHandler: Promise<Handler> | undefined;

async function createHandler(): Promise<Handler> {
  const app = await NestFactory.create(AppModule);
  configureApp(app, false);
  await app.init();
  return serverlessExpress({ app: app.getHttpAdapter().getInstance() });
}

/** API Gateway HTTP API adapter; reuse Nest and the database pool on warm invocations. */
export const handler: Handler = async (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;
  cachedHandler ??= createHandler().catch(error => {
    cachedHandler = undefined;
    throw error;
  });
  return (await cachedHandler)(event, context, callback);
};
