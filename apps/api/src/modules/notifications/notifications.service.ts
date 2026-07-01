import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { NotificationsQueryDto } from './dto/notifications-query.dto';

type NotificationInput = {
  titleAr: string;
  titleEn?: string;
  messageAr: string;
  messageEn?: string;
  type?: string;
  entityType?: string;
  entityId?: string;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  findForAdmin(_user: AuthenticatedUser, query: NotificationsQueryDto) {
    const where: Prisma.NotificationWhereInput = {
      OR: [{ userId: null }, { userId: _user.id }],
      readAt: query.unreadOnly ? null : undefined,
    };

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
  }

  async markRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  async createAdminNotification(input: NotificationInput): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId: null,
        titleAr: input.titleAr,
        titleEn: input.titleEn,
        messageAr: input.messageAr,
        messageEn: input.messageEn,
        type: input.type ?? 'INFO',
        entityType: input.entityType,
        entityId: input.entityId,
      },
    });
  }

  async createOwnerNotification(input: NotificationInput): Promise<void> {
    const owners = await this.prisma.user.findMany({
      where: { role: UserRole.OWNER, deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
    });

    if (owners.length === 0) {
      await this.createAdminNotification(input);
      return;
    }

    await this.prisma.notification.createMany({
      data: owners.map((owner) => ({
        userId: owner.id,
        titleAr: input.titleAr,
        titleEn: input.titleEn,
        messageAr: input.messageAr,
        messageEn: input.messageEn,
        type: input.type ?? 'INFO',
        entityType: input.entityType,
        entityId: input.entityId,
      })),
    });
  }
}
