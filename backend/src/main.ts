import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';
import { validateEnv } from './env.validation';

async function bootstrap() {
  validateEnv();
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const origins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());
  
  // Adiciona origens dinâmicas se estiver em produção para facilitar deploy no Easypanel
  if (process.env.NODE_ENV === 'production') {
    origins.push('https://ayratech-premiattoconnect-front.isyhhh.easypanel.host');
  }

  app.enableCors({ 
    origin: origins, 
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`[backend] listening on :${port}`);
}
bootstrap();
