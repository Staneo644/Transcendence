import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.get(Reflector);
  const corsOptions = {
    origin: '*',
  };

  const cors = require('cors');

  app.enableCors(corsOptions);
  app.use(cors(corsOptions));
  await app.init();
  await app.listen(3000);
}

bootstrap();
