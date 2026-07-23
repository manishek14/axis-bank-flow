import { IsOptional, IsString, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResumeLoanDto {
  @ApiProperty({ required: false, example: 'Updated credit score documents provided' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  hasGuarantor?: boolean;
}
