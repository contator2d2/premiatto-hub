import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { FoldersService } from './folders.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('folders')
export class FoldersController {
  constructor(private service: FoldersService) {}

  @Get()
  list(@Query('parentId') parentId?: string, @Query('includeDeleted') includeDeleted?: string) {
    return this.service.list({ parentId: parentId || null, includeDeleted: includeDeleted === 'true' });
  }

  @Get('tree')
  tree() {
    return this.service.tree();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() body: { name: string; parentId?: string; description?: string; tags?: string[]; isOfficial?: boolean; departmentId?: string },
  ) {
    return this.service.create(userId, body);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; parentId?: string; description?: string; tags?: string[]; isOfficial?: boolean; departmentId?: string },
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.softDelete(id);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string) {
    return this.service.restore(id);
  }
}
