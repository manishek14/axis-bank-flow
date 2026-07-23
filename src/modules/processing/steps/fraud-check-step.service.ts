import { Injectable } from '@nestjs/common';
import { IStepProcessor, StepExecutionResult } from '../step.interface';
import { LoanStepResult } from '@/common/enums/loan-step-result';
import { FailureReason } from '@/common/enums/failure-reason';
import { LoanStepType } from '@/common/enums/loan-step-type';
import { Loan } from '@/modules/loans/entities/loan.entity';

/**
 * Fraud check step - Mock implementation per challenge PDF:
 * - customerId starting with "FRAUD-" => FAIL
 * - customerId starting with "REVIEW-" => MANUAL_REVIEW
 * - All others => PASS
 */
@Injectable()
export class FraudCheckStepService implements IStepProcessor {
  readonly stepType = LoanStepType.FRAUD_CHECK;

  execute(loan: Loan): StepExecutionResult {
    const customerId = loan.customerId;

    if (customerId.startsWith('FRAUD-')) {
      return {
        result: LoanStepResult.FAIL,
        failureReason: FailureReason.FRAUDULENT_CUSTOMER,
        reason: `Customer ID "${customerId}" flagged as fraudulent`,
      };
    }

    if (customerId.startsWith('REVIEW-')) {
      return {
        result: LoanStepResult.MANUAL_REVIEW,
        reason: `Customer ID "${customerId}" flagged for manual review`,
      };
    }

    return {
      result: LoanStepResult.PASS,
      reason: 'No fraud indicators detected',
    };
  }
}
