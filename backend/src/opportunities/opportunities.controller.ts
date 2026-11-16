import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { OpportunitiesService } from './opportunities.service';
import { OptionalJwtAuthGuard } from 'src/auth/optional-jwt-auth.guard';

@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}
    
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  getAll(
    @Req() req: any,
    @Query('type') type?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('includeExpired') includeExpired?: string,
  ) {
    return this.opportunitiesService.getAll(
      req.user ?? undefined,
      type,
      categoryId,
      search,
      includeExpired === 'true',
    );
  }
    
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  getOne( @Param('id') id: string, @Req() req: any) {
    return this.opportunitiesService.getOne(id, req.user ?? undefined);
  }
}
