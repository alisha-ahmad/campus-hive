import { IsOptional, IsString, IsBoolean, IsEnum, IsUrl, IsDateString, ValidateIf } from 'class-validator';
import { OpportunityType } from '@prisma/client';

export class UpdatePostDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() categoryId?: string;
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
