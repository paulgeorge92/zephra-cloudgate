import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { User, SetupAdminData } from '../shared/types';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      const { ...result } = user;
      return {
        ...result,
        role: result.role as User['role'],
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      };
    }
    return null;
  }

  login(user: Pick<User, 'id' | 'email' | 'role' | 'name'>) {
    const payload = { email: user.email, sub: user.id, role: user.role, name: user.name };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  // Used for first-time setup
  async createAdmin(data: SetupAdminData) {
    const existingAdmins = await this.prisma.user.count({
      where: { role: 'ADMIN' },
    });
    if (existingAdmins > 0) {
      throw new BadRequestException('Admin already exists');
    }

    if (!data.password) {
      throw new BadRequestException('Password is required for setup');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    const { ...rest } = user;
    return this.login({
      ...rest,
      role: rest.role as User['role'],
    });
  }
}
