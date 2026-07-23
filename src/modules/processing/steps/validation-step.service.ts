import { Injectable } from '@nestjs/common';
import { IStepProcessor, StepExecutionResult } from '../step.interface';
import { LoanStepResult } from '@/common/enums/loan-step-result';
import { FailureReason } from '@/common/enums/failure-reason';
import { LoanStepType } from '@/common/enums/loan-step-type';
import { Loan } from '@/modules/loans/entities/loan.entity';

@Injectable()
export class ValidationStepService implements IStepProcessor {
  readonly stepType = LoanStepType.VALIDATION;

  execute(loan: Loan): StepExecutionResult {
    // Validate customerId - must not be empty
    if (!loan.customerId || loan.customerId.trim() === '') {
      return {
        result: LoanStepResult.FAIL,
        failureReason: FailureReason.INVALID_CUSTOMER_ID,
        reason: 'Customer ID is required and cannot be empty',
      };
    }

    // Validate amount - must be greater than zero
    if (!loan.amount || loan.amount <= 0) {
      return {
        result: LoanStepResult.FAIL,
        failureReason: FailureReason.INVALID_AMOUNT,
        reason: 'Amount must be greater than zero',
      };
    }

    // Validate phone - must be 11 digits starting with 09
    const phoneRegex = /^09\d{9}$/;
    if (!loan.phone || !phoneRegex.test(loan.phone)) {
      return {
        result: LoanStepResult.FAIL,
        failureReason: FailureReason.INVALID_PHONE,
        reason: 'Phone number must be 11 digits starting with 09',
      };
    }

    // Validate loan type - must be PERSONAL or BUSINESS
    if (!loan.loanType) {
      return {
        result: LoanStepResult.FAIL,
        failureReason: FailureReason.INVALID_LOAN_TYPE,
        reason: 'Loan type must be PERSONAL or BUSINESS',
      };
    }

    // Validate monthly income - must not be negative
    if (loan.monthlyIncome < 0) {
      return {
        result: LoanStepResult.FAIL,
        failureReason: FailureReason.INVALID_MONTHLY_INCOME,
        reason: 'Monthly income must not be negative',
      };
    }

    // Validate credit score - must be between 0 and 1000
    if (loan.creditScore < 0 || loan.creditScore > 1000) {
      return {
        result: LoanStepResult.FAIL,
        failureReason: FailureReason.INVALID_CREDIT_SCORE,
        reason: `Credit score must be between 0 and 1000, got ${loan.creditScore}`,
      };
    }

    return {
      result: LoanStepResult.PASS,
      reason: 'All validation rules passed',
    };
  }
}
