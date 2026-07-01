import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { NotificationsQueryDto } from './dto/notifications-query.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OWNER)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findForAdmin(@CurrentUser() user: AuthenticatedUser, @Query() query: NotificationsQueryDto) {
    return this.notificationsService.findForAdmin(user, query);
  }

  @Patch(':id/read')
  markRead(@Param() params: IdParamDto) {
    return this.notificationsService.markRead(params.id);
  }
}
