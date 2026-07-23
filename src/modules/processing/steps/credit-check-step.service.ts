import { Injectable } from '@nestjs/common';
import { BusinessRulesService } from '@/config/business-rules.service';
import { IStepProcessor, StepExecutionResult } from '../step.interface';
import { LoanStepResult } from '@/common/enums/loan-step-result';
import { FailureReason } from '@/common/enums/failure-reason';
import { LoanStepType } from '@/common/enums/loan-step-type';
import { Loan } from '@/modules/loans/entities/loan.entity';

/**
 * Credit check step - based on creditScore per challenge PDF:
 * - creditScore < manualReview.minScore => FAIL
 * - manualReview.minScore <= creditScore <= manualReview.maxScore => MANUAL_REVIEW
 * - creditScore > manualReview.maxScore => PASS
 * All thresholds are loaded from rules.json (no magic numbers).
 */
@Injectable()
export class CreditCheckStepService implements IStepProcessor {
  readonly stepType = LoanStepType.CREDIT_CHECK;

  constructor(private rulesService: BusinessRulesService) {}

  execute(loan: Loan): StepExecutionResult {
    const creditScore = loan.creditScore;
    const minScore = this.rulesService.getManualReviewMinScore();
    const maxScore = this.rulesService.getManualReviewMaxScore();
    const minimumCreditScore = this.rulesService.getMinimumCreditScore();

    // Below minimum => FAIL
    if (creditScore < minScore) {
      return {
        result: LoanStepResult.FAIL,
        failureReason: FailureReason.LOW_CREDIT_SCORE,
        reason: `Credit score ${creditScore} is below minimum threshold ${minScore}`,
      };
    }

    // In manual review range => MANUAL_REVIEW
    if (creditScore >= minScore && creditScore <= maxScore) {
      return {
        result: LoanStepResult.MANUAL_REVIEW,
        failureReason: FailureReason.CREDIT_SCORE_MANUAL_REVIEW,
        reason: `Credit score ${creditScore} is in manual review range (${minScore}-${maxScore})`,
      };
    }

    // Above minimumCreditScore => PASS
    if (creditScore >= minimumCreditScore) {
      return {
        result: LoanStepResult.PASS,
        reason: `Credit score ${creditScore} meets minimum requirement of ${minimumCreditScore}`,
      };
    }

    // Between maxScore and minimumCreditScore - still pass but borderline
    return {
      result: LoanStepResult.PASS,
      reason: `Credit score ${creditScore} is acceptable`,
    };
  }
}
