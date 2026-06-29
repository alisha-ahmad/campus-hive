import { Controller, Body, Get, Post, Request, UseGuards, Query, Param, Delete, Patch, Req } from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UpdatePostDto } from './dto/update-post.dto';

@Controller('posts')
export class PostsController {
  constructor(private postsService: PostsService) {}

  @UseGuards(JwtAuthGuard) @Post()
  create(@Request() req, @Body() dto: CreatePostDto) {
    return this.postsService.create(req.user.userId, dto);
  }

  @Get('feed')
  getFeed() {
    return this.postsService.getFeed();
  }

  @Get('search')
  search(@Query('q') query: string) {
    return this.postsService.search(query);
  }

  @Get('category/:id')
  getByCategory(@Param('id') id: string) {
    return this.postsService.getByCategory(id);
  }

  @Get(':id')
  getPost(@Param('id') id: string) {
    return this.postsService.getPost(id);
  }

  @UseGuards(JwtAuthGuard) @Patch(':id')
  updatePost(@Param('id') id: string, @Req() req: any, @Body() dto: UpdatePostDto) {
    return this.postsService.updatePost(id, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard) @Delete(':id')
  deletePost(@Param('id') id: string, @Req() req: any) {
    return this.postsService.deletePost(id, req.user.userId);
  }
}
