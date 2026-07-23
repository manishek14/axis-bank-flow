import { Injectable } from '@nestjs/common';
import { BusinessRulesService } from '@/config/business-rules.service';
import { IStepProcessor, StepExecutionResult } from '../step.interface';
import { LoanStepResult } from '@/common/enums/loan-step-result';
import { FailureReason } from '@/common/enums/failure-reason';
import { LoanStepType } from '@/common/enums/loan-step-type';
import { Loan } from '@/modules/loans/entities/loan.entity';

/**
 * Final Approval step (replaces ManagerApproval from PDF with human review).
 * Only executed when loan amount exceeds managerApprovalThreshold.
 * Mock logic per PDF:
 * - amount > monthlyIncome * incomeMultiplier => FAIL
 * - Otherwise => PASS
 * All thresholds from rules.json (no magic numbers).
 */
@Injectable()
export class FinalApprovalStepService implements IStepProcessor {
  readonly stepType = LoanStepType.FINAL_APPROVAL;

  constructor(private rulesService: BusinessRulesService) {}

  execute(loan: Loan): StepExecutionResult {
    const threshold = this.rulesService.getManagerApprovalThreshold();
    const multiplier = this.rulesService.getIncomeMultiplier();

    // This step is only reached for amounts exceeding threshold
    // Mock manager approval logic: if amount > monthlyIncome * multiplier => FAIL
    if (loan.amount > loan.monthlyIncome * multiplier) {
      return {
        result: LoanStepResult.FAIL,
        failureReason: FailureReason.INCOME_RATIO_TOO_HIGH,
        reason: `Loan amount ${loan.amount} exceeds income ratio threshold (${multiplier}x monthly income of ${loan.monthlyIncome})`,
      };
    }

    return {
      result: LoanStepResult.PASS,
      reason: 'Loan amount within acceptable income ratio',
    };
  }
}
