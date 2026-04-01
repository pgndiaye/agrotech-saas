import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Un compte avec cet email existe déjà');
    }

    // Créer ou trouver un tenant
    let tenantId: string;
    if (dto.tenantSlug && dto.tenantName) {
      const slugExisting = await this.prisma.tenant.findUnique({ where: { slug: dto.tenantSlug } });
      if (slugExisting) {
        throw new ConflictException('Ce slug de coopérative est déjà utilisé');
      }
      const tenant = await this.prisma.tenant.create({
        data: { name: dto.tenantName, slug: dto.tenantSlug },
      });
      tenantId = tenant.id;
    } else {
      // Tenant personnel par défaut
      const slug = dto.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');
      const tenant = await this.prisma.tenant.create({
        data: { name: dto.name, slug: `${slug}-${Date.now()}` },
      });
      tenantId = tenant.id;
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        tenantId,
        role: 'ADMIN',
      },
      include: { tenant: true },
    });

    const token = this.generateToken(user);
    return { user: this.sanitizeUser(user), token };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { tenant: true },
    });
    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const token = this.generateToken(user);
    return { user: this.sanitizeUser(user), token };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });
    return this.sanitizeUser(user);
  }

  private generateToken(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}
