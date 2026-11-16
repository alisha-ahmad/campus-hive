import { Body, Controller, Get, Param, Post, Req, UseGuards, Patch, Delete } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentContentDto } from './dto/comment-content.dto';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller()
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('posts/:id/comments')
  createComment(
    @Param('id') postId: string,
    @Req() req: any,
    @Body() dto: CommentContentDto,
  ) {
    return this.commentsService.create(req.user.userId, postId, dto);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('posts/:id/comments')
  getComments(@Param('id') postId: string, @Req() req: any) {
    return this.commentsService.getComments(postId, req.user ?? undefined);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('comments/:id')
  updateComment(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: CommentContentDto,
  ) {
    return this.commentsService.update(id, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('comments/:id')
  deleteComment(@Param('id') id: string, @Req() req: any) {
    return this.commentsService.delete(id, req.user.userId);
  }
}
