import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { Loan } from './entities/loan.entity';
import { LoanStep } from './entities/loan-step.entity';
import { LoanHistory } from './entities/loan-history.entity';
import { ProcessingModule } from '@/modules/processing/processing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Loan, LoanStep, LoanHistory]),
    ProcessingModule,
  ],
  controllers: [LoansController],
  providers: [LoansService],
  exports: [LoansService],
})
export class LoansModule {}
