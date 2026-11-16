import { IsString, IsOptional, IsBoolean, IsDateString, IsEnum, IsUrl, ValidateIf } from 'class-validator';
import { OpportunityType } from '@prisma/client';

export class CreatePostDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() categoryName?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() videoUrl?: string;
  @IsOptional() @IsString() attachmentUrl?: string;
  @IsOptional() @IsBoolean() isAnonymous?: boolean;

  @IsOptional() @IsBoolean() isOpportunity?: boolean;
  @ValidateIf((o) => o.isOpportunity===true) @IsEnum(OpportunityType) opportunityType?: OpportunityType;
  @ValidateIf((o) => o.isOpportunity===true) @IsString() organization?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsUrl() applicationUrl?: string;
  @IsOptional() @IsDateString() deadline?: string;
}
