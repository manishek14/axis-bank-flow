import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Loan } from '@/modules/loans/entities/loan.entity';
import { LoanHistory } from '@/modules/loans/entities/loan-history.entity';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [TypeOrmModule.forFeature([Loan, LoanHistory])],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
