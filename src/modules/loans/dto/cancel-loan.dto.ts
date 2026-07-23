import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelLoanDto {
  @ApiProperty({ required: false, example: 'No longer needed' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
