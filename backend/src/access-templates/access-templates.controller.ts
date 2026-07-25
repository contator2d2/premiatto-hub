import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { AppRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { AccessTemplatesService } from './access-templates.service';

@Controller('access-templates')
@Roles(AppRole.super_admin)
export class AccessTemplatesController {
  constructor(private svc: AccessTemplatesService) {}

  @Get('modules')
  modules() {
    return this.svc.availableModules();
  }

  @Get()
  list() {
    return this.svc.list();
  }

  @Post()
  create(@Body() body: { name: string; description?: string; moduleKeys: string[] }) {
    return this.svc.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  @Put('role/:role')
  setRole(@Param('role') role: AppRole, @Body() body: { templateId: string | null }) {
    return this.svc.setRoleDefault(role, body.templateId);
  }

  @Put('user/:userId')
  setUser(
    @Param('userId') userId: string,
    @Body() body: { templateId?: string | null; moduleKeys?: string[] | null },
  ) {
    return this.svc.setUserOverride(userId, body);
  }
}
