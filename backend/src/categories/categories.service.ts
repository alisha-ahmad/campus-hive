import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  getAll() {
    return this.prisma.category.findMany();
  }

  async seed() {
    return this.prisma.category.createMany({
      data: [
        { name: 'General' },
        { name: 'Academics' },
        { name: 'Events' },
        { name: 'Clubs' },
        { name: 'Hostel' },
        { name: 'Sports' },
        { name: 'Lost & Found' },
        { name: 'Internships' },
        { name: 'Research' },
        { name: 'Other' },
      ],
      skipDuplicates: true,
    });
  }
}
