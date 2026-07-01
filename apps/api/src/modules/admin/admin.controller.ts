import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminService } from './admin.service';
import { AuditLogsQueryDto } from './dto/audit-logs-query.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OWNER)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('reports')
  getReports() {
    return this.adminService.getReports();
  }

  @Get('audit-logs')
  findAuditLogs(@Query() query: AuditLogsQueryDto) {
    return this.adminService.findAuditLogs(query);
  }
}
