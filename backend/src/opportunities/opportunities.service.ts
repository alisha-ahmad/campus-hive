import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { formatPost } from '../common/formatters/post-response.util';
import { isModerator } from '../common/utils/role.util';
import { OpportunityType } from '@prisma/client';

@Injectable()
export class OpportunitiesService {
  constructor(private prisma: PrismaService) {}

  private opportunitySelect(currentUserId?: string) {
    return {
      id: true,
      title: true,
      content: true,
      imageUrl: true,
      videoUrl: true,
      attachmentUrl: true,
      attachmentName: true,
      attachmentMimeType: true,
      createdAt: true,
      updatedAt: true,
      isAnonymous: true,
      isHidden: true,
      hiddenReason: true,
      isOpportunity: true,
      opportunityType: true,
      organization: true,
      location: true,
      applicationUrl: true,
      deadline: true,
      category: {
        select: { id: true, name: true },
      },
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: { likes: true, comments: true, bookmarks: true },
      },
      likes: currentUserId
        ? {
            where: { userId: currentUserId },
            select: { userId: true },
          }
        : { select: { userId: true } },
      bookmarks: currentUserId
        ? {
            where: { userId: currentUserId },
            select: { userId: true },
          }
        : { select: { userId: true } },
      mentions: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    };
  }

  async getAll(
    currentUser?: { userId?: string; role?: string; },
    type?: string,
    categoryId?: string,
    search?: string,
    includeExpired = false,
  ) {
    const where: any = { isOpportunity: true };
    if (!isModerator(currentUser)) where.isHidden = false;
    if (!includeExpired || !isModerator(currentUser)) {
      where.OR = [
        { deadline: null },
        { deadline: { gte: new Date() } },
      ];
    }
    if (type) {
      const validTypes = Object.values(OpportunityType);
      if (!validTypes.includes(type as OpportunityType)) {
        throw new BadRequestException( `Invalid opportunity type. Allowed values: ${validTypes.join(', ')}`);
      }
      where.opportunityType = type as OpportunityType;
    }
    
    if (categoryId) where.categoryId = categoryId;
    if (search?.trim()) {
      const query = search.trim();
      where.AND = [
        {
          OR: [
            { title: {contains: query, mode: 'insensitive'} },
            { content: {contains: query, mode: 'insensitive'} },
            { organization: {contains: query, mode: 'insensitive'} },
            { location: {contains: query, mode: 'insensitive'} },
          ],
        },
      ];
    }
    const posts = await this.prisma.post.findMany({
      where,
      select: this.opportunitySelect(currentUser?.userId),
      orderBy: [
        { deadline: 'asc' },
        { createdAt: 'desc' },
      ],
    });
    return posts.map((post) => formatPost(post, currentUser));
  }

  async getOne(id: string, currentUser?: {userId?: string; role?: string;}) {
    const post = await this.prisma.post.findFirst({
        where: { id, isOpportunity: true },
        select: this.opportunitySelect(currentUser?.userId),
    });
    if (!post) throw new NotFoundException('Opportunity not found');
    if (post.isHidden && !isModerator(currentUser)) throw new NotFoundException('Opportunity not found');
    return formatPost(post, currentUser);
  }


}
