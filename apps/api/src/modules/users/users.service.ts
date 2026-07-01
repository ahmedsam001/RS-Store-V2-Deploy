import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersQueryDto } from './dto/users-query.dto';

@Injectable()
export class UsersService {
  private readonly userSelect = {
    id: true,
    name: true,
    email: true,
    phone: true,
    role: true,
    status: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
  } satisfies Prisma.UserSelect;

  constructor(private readonly prisma: PrismaService, private readonly auditService: AuditService) {}

  async create(actor: AuthenticatedUser, dto: CreateUserDto) {
    this.assertCanAssignRole(actor, dto.role ?? UserRole.CUSTOMER);
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: dto.role,
        status: dto.status,
      },
      select: this.userSelect,
    });
    await this.auditService.log({
      actorUserId: actor.id,
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: user.id,
      metadata: { role: user.role, status: user.status },
    });
    return user;
  }

  findAll(query: UsersQueryDto) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      role: query.role,
      status: query.status,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
            { phone: { contains: query.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    return this.prisma.user.findMany({
      where,
      select: this.userSelect,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
  }

  findById(id: string) {
    return this.prisma.user.findFirstOrThrow({
      where: { id, deletedAt: null },
      select: this.userSelect,
    });
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateUserDto) {
    const target = await this.findExistingUser(id);
    this.assertCanModifyTarget(actor, target);

    if (dto.role) {
      this.assertCanAssignRole(actor, dto.role);
    }

    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 12) : undefined;

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        role: dto.role,
        status: dto.status,
        passwordHash,
      },
      select: this.userSelect,
    });
    await this.auditService.log({
      actorUserId: actor.id,
      action: 'USER_UPDATED',
      entityType: 'USER',
      entityId: id,
      metadata: { role: dto.role ?? null, status: dto.status ?? null, passwordChanged: Boolean(dto.password) },
    });
    return user;
  }

  async remove(actor: AuthenticatedUser, id: string) {
    const target = await this.findExistingUser(id);
    this.assertCanModifyTarget(actor, target);

    if (target.id === actor.id) {
      throw new BadRequestException('You cannot remove your own account');
    }

    if (target.role === UserRole.OWNER) {
      await this.assertNotLastOwner(target.id);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: this.userSelect,
    });
    await this.auditService.log({
      actorUserId: actor.id,
      action: 'USER_DELETED',
      entityType: 'USER',
      entityId: id,
      metadata: { previousRole: target.role },
    });
    return user;
  }

  private async findExistingUser(id: string): Promise<{ id: string; role: UserRole }> {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null }, select: { id: true, role: true } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private assertCanAssignRole(actor: AuthenticatedUser, role: UserRole): void {
    if (role === UserRole.OWNER && actor.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only an owner can assign the owner role');
    }
  }

  private assertCanModifyTarget(actor: AuthenticatedUser, target: { id: string; role: UserRole }): void {
    if (target.role === UserRole.OWNER && actor.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only an owner can modify owner accounts');
    }
  }

  private async assertNotLastOwner(targetOwnerId: string): Promise<void> {
    const ownerCount = await this.prisma.user.count({
      where: { role: UserRole.OWNER, id: { not: targetOwnerId }, deletedAt: null },
    });

    if (ownerCount === 0) {
      throw new BadRequestException('At least one owner account must remain active');
    }
  }
}
