import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { AppRole } from '@prisma/client';
import { UsersService } from './users.service';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('users')
@Roles(AppRole.super_admin, AppRole.admin)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  list() {
    return this.users.list();
  }

  @Post()
  create(@Body() body: { email: string; password: string; fullName?: string; roles?: AppRole[] }) {
    return this.users.create(body);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.users.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.users.update(id, body);
  }

  @Put(':id/roles')
  setRoles(@Param('id') id: string, @Body() body: { roles: AppRole[] }) {
    return this.users.setRoles(id, body.roles || []);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.users.remove(id);
  }
}
