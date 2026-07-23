import { LoanStepResult } from '@/common/enums/loan-step-result';
import { FailureReason } from '@/common/enums/failure-reason';
import { Loan } from '@/modules/loans/entities/loan.entity';

/**
 * Interface for all workflow step processors.
 * Each step implements this interface, making the workflow extensible:
 * adding a new step only requires creating a new class implementing IStepProcessor
 * and registering it in StepExecutorService.
 */
export interface IStepProcessor {
  /**
   * The step type this processor handles
   */
  readonly stepType: string;

  /**
   * Execute the step and return the result
   */
  execute(loan: Loan): StepExecutionResult;
}

export interface StepExecutionResult {
  result: LoanStepResult;
  failureReason?: FailureReason;
  reason?: string;
}
