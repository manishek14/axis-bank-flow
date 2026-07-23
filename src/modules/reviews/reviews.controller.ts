import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class ReviewDecisionDto {
  @ApiProperty({ example: true, description: 'Approve or reject' })
  @IsBoolean()
  approved: boolean;

  @ApiProperty({ required: false, example: 'All checks passed' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

class ReviewQueryDto {
  @IsOptional()
  status?: string;
}

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('pending')
  @ApiOperation({ summary: 'List pending reviews' })
  getPendingReviews(@Query() query: ReviewQueryDto) {
    return this.reviewsService.getPendingReviews();
  }

  @Post(':loanId/decide')
  @ApiOperation({ summary: 'Make a review decision on a loan' })
  makeDecision(
    @Param('loanId') loanId: string,
    @Body() dto: ReviewDecisionDto,
  ) {
    return this.reviewsService.makeDecision(loanId, dto.approved, dto.reason);
  }
}
