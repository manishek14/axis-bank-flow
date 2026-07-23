import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Loan } from '@/modules/loans/entities/loan.entity';
import { LoanStep } from '@/modules/loans/entities/loan-step.entity';
import { LoanHistory } from '@/modules/loans/entities/loan-history.entity';
import { WorkflowService } from './workflow.service';
import { ValidationStepService } from './steps/validation-step.service';
import { FraudCheckStepService } from './steps/fraud-check-step.service';
import { GuarantorCheckStepService } from './steps/guarantor-check-step.service';
import { CreditCheckStepService } from './steps/credit-check-step.service';
import { FinalApprovalStepService } from './steps/final-approval-step.service';
import { BusinessRulesService } from '@/config/business-rules.service';

@Module({
  imports: [TypeOrmModule.forFeature([Loan, LoanStep, LoanHistory])],
  providers: [
    BusinessRulesService,
    WorkflowService,
    ValidationStepService,
    FraudCheckStepService,
    GuarantorCheckStepService,
    CreditCheckStepService,
    FinalApprovalStepService,
  ],
  exports: [WorkflowService],
})
export class ProcessingModule {}
