import { Module } from '@nestjs/common';
import { AccessTemplatesController } from './access-templates.controller';
import { AccessTemplatesService } from './access-templates.service';

@Module({
  controllers: [AccessTemplatesController],
  providers: [AccessTemplatesService],
  exports: [AccessTemplatesService],
})
export class AccessTemplatesModule {}
