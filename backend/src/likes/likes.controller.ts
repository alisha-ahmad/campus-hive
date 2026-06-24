import { Controller, Post, Delete, Param, Req, UseGuards } from '@nestjs/common';
import { LikesService } from './likes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';


@Controller('posts')
export class LikesController {
  constructor(private likesService: LikesService) {}

  @UseGuards(JwtAuthGuard) @Post(':id/like')
  like(@Param('id') postId: string, @Req() req: any) {
    return this.likesService.likePost(req.user.sub, postId);
  }

  @UseGuards(JwtAuthGuard) @Delete(':id/like')
  unlike(@Param('id') postId: string, @Req() req: any) {
    return this.likesService.unlikePost(req.user.sub, postId);
  }
}
