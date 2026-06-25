import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateUserData, UpdateUserData, User, UserRole } from '../shared/types';
import * as bcrypt from 'bcrypt';
import { CloudflareService } from '../cloudflare/cloudflare.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private cloudflare: CloudflareService,
  ) {}

  async findAll(page?: number, per_page?: number): Promise<{ response: User[], total_count: number }> {
    const skip = ((page || 1) - 1) * (per_page || 10);
    const take = per_page || 10;

    const [users, total_count] = await Promise.all([
      this.prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          cloudflareId: true,
          createdAt: true,
          updatedAt: true,
        },
        where: {
          role: {
            not: 'ADMIN',
          },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.user.count({
        where: {
          role: {
            not: 'ADMIN',
          },
        },
      })
    ]);

    return {
      response: users.map((u) => ({
        ...u,
        role: u.role as UserRole,
        cloudflareId: u.cloudflareId || undefined,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      })),
      total_count
    };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        cloudflareId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return {
      ...user,
      role: user.role as UserRole,
      cloudflareId: user.cloudflareId || undefined,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async create(data: CreateUserData): Promise<User> {
    const hashedPassword = data.password
      ? await bcrypt.hash(data.password, 10)
      : null;
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        password: hashedPassword,
      },
    });

    // Sync to Cloudflare if user is a MEMBER
    if (user.role === 'MEMBER') {
      try {
        const cfRes = await this.cloudflare.addAccountMemberByRole(user.name, user.email, 'MEMBER');
        if (cfRes?.id) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { cloudflareId: cfRes.id },
          });
          user.cloudflareId = cfRes.id;
        }
      } catch (e) {
        console.error('Failed to sync user creation to Cloudflare:', e);
      }
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      cloudflareId: user.cloudflareId || undefined,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    const { currentPassword, ...updateData } = data;
    const prismaData: Record<string, string | undefined | null> = {
      name: updateData.name,
      email: updateData.email,
      role: updateData.role,
    };

    if (updateData.password) {
      if (!currentPassword) {
        throw new BadRequestException(
          'Current password is required to change password',
        );
      }
      const user = await this.prisma.user.findUniqueOrThrow({ where: { id } });
      if (
        !user.password ||
        !(await bcrypt.compare(currentPassword, user.password))
      ) {
        throw new BadRequestException('Invalid current password');
      }
      prismaData.password = await bcrypt.hash(updateData.password, 10);
      delete prismaData.confirm; // Ensure frontend confirm field doesn't leak
    }
    const userBefore = await this.prisma.user.findUniqueOrThrow({ where: { id } });

    const updated = await this.prisma.user.update({
      where: { id },
      data: prismaData,
    });

    // Sync to Cloudflare if not Admin
    if (userBefore.role !== 'ADMIN' && updateData.role && updateData.role !== 'ADMIN') {
      try {
        await this.cloudflare.updateAccountMemberRoleByEmail(
          updated.email,
          updateData.role as 'ADMIN' | 'MEMBER',
          updated.cloudflareId || undefined,
        );
      } catch (e) {
        console.error('Failed to sync user update to Cloudflare:', e);
      }
    }
    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role as UserRole,
      cloudflareId: updated.cloudflareId || undefined,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async delete(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (user && user.role !== 'ADMIN') {
      try {
        await this.cloudflare.deleteAccountMemberByEmail(user.email, user.cloudflareId || undefined);
      } catch (e) {
        console.error('Failed to sync user deletion to Cloudflare:', e);
      }
    }
    await this.prisma.user.delete({ where: { id } });
  }
}
