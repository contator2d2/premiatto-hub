import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import { AppRole, PolicyExceptionStatus, PolicyStatus } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { PoliciesService } from './policies.service';

@Controller('policies')
export class PoliciesController {
  constructor(private svc: PoliciesService) {}

  // ---- Read (admin + super_admin) ----
  @Get()
  @Roles(AppRole.super_admin, AppRole.admin)
  list(@Query('status') status?: PolicyStatus, @Query('q') q?: string) {
    return this.svc.list({ status, q });
  }

  @Get('reports')
  @Roles(AppRole.super_admin, AppRole.admin)
  reports() {
    return this.svc.reports();
  }

  @Get('audit')
  @Roles(AppRole.super_admin, AppRole.admin)
  audit(@Query('policyId') policyId?: string) {
    return this.svc.listAudit(policyId);
  }

  @Get('presets')
  @Roles(AppRole.super_admin, AppRole.admin, AppRole.gestor)
  presets() {
    return this.svc.listPresets();
  }

  @Get('exceptions')
  @Roles(AppRole.super_admin, AppRole.admin)
  exceptions(@Query('status') status?: PolicyExceptionStatus) {
    return this.svc.listExceptions(status);
  }

  @Get(':id')
  @Roles(AppRole.super_admin, AppRole.admin)
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  // ---- Write (super_admin only) ----
  @Post()
  @Roles(AppRole.super_admin)
  create(@Req() req: any, @Body() body: any) {
    return this.svc.create(req.user.userId, body);
  }

  @Put(':id')
  @Roles(AppRole.super_admin)
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.update(req.user.userId, id, body);
  }

  @Delete(':id')
  @Roles(AppRole.super_admin)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.svc.remove(req.user.userId, id);
  }

  @Post(':id/duplicate')
  @Roles(AppRole.super_admin)
  duplicate(@Req() req: any, @Param('id') id: string) {
    return this.svc.duplicate(req.user.userId, id);
  }

  @Put(':id/status')
  @Roles(AppRole.super_admin)
  setStatus(@Req() req: any, @Param('id') id: string, @Body() body: { status: PolicyStatus }) {
    return this.svc.setStatus(req.user.userId, id, body.status);
  }

  @Post(':id/test')
  @Roles(AppRole.super_admin, AppRole.admin)
  test(@Param('id') id: string, @Body() body: any) {
    return this.svc.test(id, body);
  }

  // ---- Presets ----
  @Post('presets')
  @Roles(AppRole.super_admin)
  createPreset(@Body() body: any) {
    return this.svc.createPreset(body);
  }

  @Put('presets/:id')
  @Roles(AppRole.super_admin)
  updatePreset(@Param('id') id: string, @Body() body: any) {
    return this.svc.updatePreset(id, body);
  }

  @Delete('presets/:id')
  @Roles(AppRole.super_admin)
  removePreset(@Param('id') id: string) {
    return this.svc.removePreset(id);
  }

  // ---- Exceptions ----
  @Post('exceptions')
  requestException(@Req() req: any, @Body() body: any) {
    return this.svc.requestException(req.user.userId, body);
  }

  @Put('exceptions/:id/review')
  @Roles(AppRole.super_admin, AppRole.admin)
  reviewException(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { decision: 'approve' | 'reject'; notes?: string },
  ) {
    return this.svc.reviewException(req.user.userId, id, body.decision, body.notes);
  }

  // ---- Attach ----
  @Put('attach/folder/:folderId')
  @Roles(AppRole.super_admin, AppRole.admin)
  attachFolder(
    @Req() req: any,
    @Param('folderId') folderId: string,
    @Body() body: { policyId: string | null; inheritance?: string },
  ) {
    return this.svc.attachToFolder(req.user.userId, folderId, body.policyId, body.inheritance);
  }

  @Put('attach/document/:documentId')
  @Roles(AppRole.super_admin, AppRole.admin)
  attachDocument(
    @Req() req: any,
    @Param('documentId') documentId: string,
    @Body() body: { policyId: string | null; inheritance?: string; locked?: boolean },
  ) {
    return this.svc.attachToDocument(req.user.userId, documentId, body.policyId, body.inheritance, body.locked);
  }
}
