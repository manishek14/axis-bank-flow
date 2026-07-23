import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Loan } from '@/modules/loans/entities/loan.entity';
import { LoanStep } from '@/modules/loans/entities/loan-step.entity';
import { LoanHistory } from '@/modules/loans/entities/loan-history.entity';
import { ExpirationJobService } from './expiration.job';

@Module({
  imports: [TypeOrmModule.forFeature([Loan, LoanStep, LoanHistory])],
  providers: [ExpirationJobService],
})
export class JobsModule {}
