import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.category.createMany({
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

main()
  .finally(async () => {
    await prisma.$disconnect();
  });