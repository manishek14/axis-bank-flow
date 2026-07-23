import { Injectable } from '@nestjs/common';
import { IStepProcessor, StepExecutionResult } from '../step.interface';
import { LoanStepResult } from '@/common/enums/loan-step-result';
import { FailureReason } from '@/common/enums/failure-reason';
import { LoanStepType } from '@/common/enums/loan-step-type';
import { LoanType } from '@/common/enums/loan-type';
import { Loan } from '@/modules/loans/entities/loan.entity';

/**
 * Guarantor check step - only executed for BUSINESS loans per PDF:
 * - hasGuarantor == false => FAIL
 * - hasGuarantor == true => PASS
 * For PERSONAL loans, this step is skipped (returns PASS immediately).
 */
@Injectable()
export class GuarantorCheckStepService implements IStepProcessor {
  readonly stepType = LoanStepType.GUARANTOR_CHECK;

  execute(loan: Loan): StepExecutionResult {
    // PERSONAL loans skip guarantor check
    if (loan.loanType === LoanType.PERSONAL) {
      return {
        result: LoanStepResult.PASS,
        reason: 'Guarantor check skipped for PERSONAL loans',
      };
    }

    // BUSINESS loans require guarantor
    if (!loan.hasGuarantor) {
      return {
        result: LoanStepResult.FAIL,
        failureReason: FailureReason.GUARANTOR_REQUIRED,
        reason: 'BUSINESS loans require a guarantor',
      };
    }

    return {
      result: LoanStepResult.PASS,
      reason: 'Guarantor verified',
    };
  }
}
