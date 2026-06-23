import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma['user'].findUnique({
      where: { email },
    });
  }

  create(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    return this.prisma['user'].create({
      data,
    });
  }

  async findById(id: string){
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true,
        bio: true,
        department: true,
        graduationYear: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  }

  async updateProfile(
    userId: string,
    data: {
      username?: string;
      bio?: string;
      department?: string;
      graduationYear?: number;
    },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }
}
