import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { formatPost } from '../common/formatters/post-response.util';
import { join } from 'path';
import * as fs from 'fs';
import { resolveMentions } from '../common/utils/mentions.util';
import { isModerator } from '../common/utils/role.util';
import { ensureUserNotSuspended } from '../common/utils/user-status.util';
import { OpportunityType } from '@prisma/client';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  private postSelect(currentUserId?: string) {
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
        select: {
          likes: true,
          comments: true,
          bookmarks: true,
        },
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

      //opportunities
      isOpportunity: true,
      opportunityType: true,
      organization: true,
      location: true,
      applicationUrl: true,
      deadline: true,
    };
  }

  private postWithCommentsSelect(currentUserId?: string) {
    return {
      ...this.postSelect(currentUserId),
      comments: {
        orderBy: { createdAt: 'asc' as const },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              avatarUrl: true,
            },
          },
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
        },
      },
    };
  }

  async create(
    authorId: string,
    dto: CreatePostDto,
    files?: {
      image?: Express.Multer.File[];
      video?: Express.Multer.File[];
      attachment?: Express.Multer.File[];
    },
  ) {
    await ensureUserNotSuspended(this.prisma, authorId);
    const image = files?.image?.[0];
    const video = files?.video?.[0];
    const attachment = files?.attachment?.[0];
    if (!dto.content?.trim() && !image && !video && !attachment) {
      throw new BadRequestException(
        'Post must contain text, an image, a video, or an attachment',
      );
    }
    const generalCategory = await this.prisma.category.findFirst({
      where: { name: 'General' },
    });
    if (!generalCategory) {
      throw new NotFoundException('Default category "General" not found');
    }
    if (dto.isOpportunity) {
      if (!dto.title?.trim()) throw new BadRequestException('Title required for opportunity post');
      if (!dto.opportunityType) throw new BadRequestException('Opportunity type required for opportunity post');
      const validTypes = Object.values(OpportunityType);
      if (!validTypes.includes(dto.opportunityType as OpportunityType)) {
        throw new BadRequestException(`Invalid opportunity type. Allowed values: ${validTypes.join(', ')}`);
      }
      if (!dto.organization?.trim()) throw new BadRequestException('Organization required for opportunity post');
      if (dto.deadline) {
        const deadline = new Date(dto.deadline);
        if (isNaN(deadline.getTime())) throw new BadRequestException('Invalid opportunity deadline');
        if (deadline < new Date()) throw new BadRequestException('Opportunity deadline cannot be in the past');
      }
    }
    if (dto.isOpportunity && dto.isAnonymous) {
      throw new BadRequestException('Opportunity posts cannot be anonymous');
    }
    const resolvedMentions = await resolveMentions(this.prisma, dto.content);
    const attachmentExt = attachment ? attachment.mimetype : null;
    const post = await this.prisma.$transaction(async (tx) => {
      const createdPost = await tx.post.create({
        data: {
          title: dto.isOpportunity ? dto.title?.trim() : null,
          content: dto.content,
          authorId,
          categoryId: dto.categoryId ?? generalCategory.id,
          isAnonymous: !!dto.isAnonymous,
          imageUrl: image ? `/uploads/posts/images/${image.filename}` : null,
          videoUrl: video ? `/uploads/posts/videos/${video.filename}` : null,
          attachmentUrl: attachment ? `/uploads/posts/files/${attachment.filename}` : null,
          attachmentName: attachment ? attachment.originalname : null,
          attachmentMimeType: attachmentExt,

          isOpportunity: !!dto.isOpportunity,
          opportunityType: dto.isOpportunity ? dto.opportunityType : null,
          organization: dto.isOpportunity ? dto.organization?.trim() : null,
          location: dto.isOpportunity ? dto.location?.trim() : null,
          applicationUrl: dto.isOpportunity ? dto.applicationUrl?.trim() : null,
          deadline: dto.isOpportunity && dto.deadline ? new Date(dto.deadline) : null,
        },
      });
      if (resolvedMentions.length) {
        await tx.postMention.createMany({
          data: resolvedMentions.map((mention) => ({
            postId: createdPost.id,
            userId: mention.userId,
            username: mention.username ?? '',
          })),
          skipDuplicates: true,
        });
      }
      return tx.post.findUniqueOrThrow({
        where: { id: createdPost.id },
        select: this.postSelect(authorId),
      });
    });
    return formatPost(post, { userId: authorId });
  }

  async getFeed(currentUser?: { userId?: string, role?: string }, category?: string) {
    const where: any = category ? { category: { name: category } } : {};
    if (!isModerator(currentUser)) {
      where.isHidden = false;
    }
    const posts = await this.prisma.post.findMany({
      where,
      select: this.postSelect(currentUser?.userId),
      orderBy: { createdAt: 'desc' },
    });
    return posts.map((post) => formatPost(post, currentUser));
  }

  async search(query: string, currentUser?: { userId?: string, role?: string }) {
    if (!query?.trim()) {
      throw new BadRequestException('Search query is required');
    }
    const where: any = {
      OR: [
        { content: { contains: query, mode: 'insensitive' } },
        { category: { name: { contains: query, mode: 'insensitive' } } },
        { author: { username: { contains: query, mode: 'insensitive' } } },
        { author: { firstName: { contains: query, mode: 'insensitive' } } },
        { author: { lastName: { contains: query, mode: 'insensitive' } } },
      ],
    };
    if (!isModerator(currentUser)) {
      where.isHidden = false;
    }
    const posts = await this.prisma.post.findMany({
      where,
      select: this.postSelect(currentUser?.userId),
      orderBy: { createdAt: 'desc' },
    });
    return posts.map((post) => formatPost(post, currentUser));
  }

  async getByCategory(categoryId: string, currentUser?: { userId?: string; role?: string }) {
    const where: any = { categoryId };
    if (!isModerator(currentUser)) {
      where.isHidden = false;
    }
    const posts = await this.prisma.post.findMany({
      where,
      select: this.postSelect(currentUser?.userId),
      orderBy: { createdAt: 'desc' },
    });
    return posts.map((post) => formatPost(post, currentUser));
  }

  async getPost(id: string, currentUser?: { userId?: string; role?: string }) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: this.postWithCommentsSelect(currentUser?.userId),
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.isHidden && !isModerator(currentUser)) {
      throw new NotFoundException('Post not found');
    }
    return formatPost(post, currentUser);
  }

  async updatePost(postId: string, userId: string, dto: UpdatePostDto) {
    await ensureUserNotSuspended(this.prisma, userId);
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own posts');
    }
    if (post.isHidden) {
      throw new ForbiddenException('Hidden posts cannot be edited');
    }
    const nextIsOpportunity = dto.isOpportunity !== undefined ? dto.isOpportunity : post.isOpportunity;
    const nextTitle = dto.title !== undefined ? dto.title.trim() : post.title;
    const nextOpportunityType = dto.opportunityType !== undefined ? dto.opportunityType : post.opportunityType;
    const nextOrganization = dto.organization !== undefined ? dto.organization.trim() : post.organization;
    const nextLocation = dto.location !== undefined ? dto.location.trim() : post.location;
    const nextApplicationUrl = dto.applicationUrl !== undefined ? dto.applicationUrl.trim() : post.applicationUrl;
    const nextDeadline = dto.deadline !== undefined ? new Date(dto.deadline) : post.deadline;
    if (nextIsOpportunity) {
      if (!nextTitle) throw new BadRequestException('Opportunity title is required');
      if (!nextOpportunityType) throw new BadRequestException('Opportunity type is required');
      const validTypes = Object.values(OpportunityType); 
      if (!validTypes.includes(nextOpportunityType as OpportunityType)) { 
        throw new BadRequestException(`Invalid opportunity type. Allowed values: ${validTypes.join(', ')}`); 
      }
      if (!nextOrganization) throw new BadRequestException('Organization is required');
      if (nextDeadline) { 
        if (isNaN(nextDeadline.getTime())) throw new BadRequestException('Invalid opportunity deadline');
        if (nextDeadline.getTime() < Date.now()) throw new BadRequestException('Opportunity deadline cannot be in the past'); 
      }
    }
    const nextIsAnonymous = dto.isAnonymous !== undefined ? dto.isAnonymous : post.isAnonymous;
    if (nextIsOpportunity && nextIsAnonymous) throw new BadRequestException('Opportunity posts cannot be anonymous');
    const nextContent = dto.content !== undefined ? dto.content : post.content;
    const resolvedMentions = await resolveMentions(this.prisma, nextContent);
    const updatedPost = await this.prisma.$transaction(async (tx) => {
      await tx.post.update({
        where: { id: postId },
        data: {
          title: nextIsOpportunity ? nextTitle : null,
          content: dto.content,
          categoryId: dto.categoryId,
          isAnonymous: nextIsAnonymous,
          isOpportunity: nextIsOpportunity,
          opportunityType: nextIsOpportunity ? nextOpportunityType : null,
          organization: nextIsOpportunity ? nextOrganization : null,
          location: nextIsOpportunity ? nextLocation : null,
          applicationUrl: nextIsOpportunity ? nextApplicationUrl : null,
          deadline: nextIsOpportunity ? nextDeadline : null,
        },
      });
      await tx.postMention.deleteMany({
        where: { postId },
      });
      if (resolvedMentions.length) {
        await tx.postMention.createMany({
          data: resolvedMentions.map((mention) => ({
            postId,
            userId: mention.userId,
            username: mention.username ?? '',
          })),
          skipDuplicates: true,
        });
      }
      return tx.post.findUniqueOrThrow({
        where: { id: postId },
        select: this.postSelect(userId),
      });
    });
    return formatPost(updatedPost, { userId });
  }

  async deletePost(postId: string, userId: string) {
    await ensureUserNotSuspended(this.prisma, userId);
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }
    const filePaths = [post.imageUrl, post.videoUrl, post.attachmentUrl].filter(Boolean) as string[];
    for (const fileUrl of filePaths) {
      const filePath = join(process.cwd(), fileUrl.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    await this.prisma.post.delete({
      where: { id: postId },
    });
    return {
      message: 'Post deleted successfully',
    };
  }
  
}
