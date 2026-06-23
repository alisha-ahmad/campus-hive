import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(30) username?: string;
  @IsOptional() @IsString() @MaxLength(300) bio?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsInt() graduationYear?: number;
}