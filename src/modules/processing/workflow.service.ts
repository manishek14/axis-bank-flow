import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from '@/modules/loans/entities/loan.entity';
import { LoanStep } from '@/modules/loans/entities/loan-step.entity';
import { LoanHistory } from '@/modules/loans/entities/loan-history.entity';
import {
  LoanStatus,
  LoanStepType,
  LoanStepStatus,
  LoanStepResult,
  TERMINAL_STATUSES,
  HistoryType,
} from '@/common/enums';
import { BusinessRulesService } from '@/config/business-rules.service';
import { IStepProcessor } from './step.interface';
import { ValidationStepService } from './steps/validation-step.service';
import { FraudCheckStepService } from './steps/fraud-check-step.service';
import { GuarantorCheckStepService } from './steps/guarantor-check-step.service';
import { CreditCheckStepService } from './steps/credit-check-step.service';
import { FinalApprovalStepService } from './steps/final-approval-step.service';
import { LoanType } from '@/common/enums/loan-type';

@Injectable()
export class WorkflowService {
  private stepProcessors: Map<string, IStepProcessor>;

  constructor(
    @InjectRepository(Loan)
    private loanRepository: Repository<Loan>,
    @InjectRepository(LoanStep)
    private stepRepository: Repository<LoanStep>,
    @InjectRepository(LoanHistory)
    private historyRepository: Repository<LoanHistory>,
    private rulesService: BusinessRulesService,
    // Step processors injected individually for explicit registration
    private validationStep: ValidationStepService,
    private fraudCheckStep: FraudCheckStepService,
    private guarantorCheckStep: GuarantorCheckStepService,
    private creditCheckStep: CreditCheckStepService,
    private finalApprovalStep: FinalApprovalStepService,
  ) {
    // Register all step processors - adding a new step only requires
    // creating a new IStepProcessor implementation and registering it here
    this.stepProcessors = new Map<string, IStepProcessor>();
    this.stepProcessors.set(LoanStepType.VALIDATION, this.validationStep);
    this.stepProcessors.set(LoanStepType.FRAUD_CHECK, this.fraudCheckStep);
    this.stepProcessors.set(LoanStepType.GUARANTOR_CHECK, this.guarantorCheckStep);
    this.stepProcessors.set(LoanStepType.CREDIT_CHECK, this.creditCheckStep);
    this.stepProcessors.set(LoanStepType.FINAL_APPROVAL, this.finalApprovalStep);
  }

  /**
   * Execute the full workflow for a loan application.
   * Workflow is conditional based on loan type and amount:
   *
   * PERSONAL loans:
   *   VALIDATION → FRAUD_CHECK → CREDIT_CHECK → APPROVED
   *   (If amount > threshold: → FINAL_APPROVAL before APPROVED)
   *
   * BUSINESS loans:
   *   VALIDATION → FRAUD_CHECK → GUARANTOR_CHECK → CREDIT_CHECK → APPROVED
   */
  async executeWorkflow(loan: Loan): Promise<Loan> {
    // Determine the workflow steps based on loan type and amount
    const steps = this.getWorkflowSteps(loan);

    // Update loan status to IN_PROGRESS
    loan.status = LoanStatus.IN_PROGRESS;
    await this.loanRepository.save(loan);

    // Execute each step sequentially
    for (const stepType of steps) {
      // Check if step is already completed (idempotent processing)
      const existingStep = await this.findCompletedStep(loan.id, stepType);
      if (existingStep) {
        // Step already processed - skip but check result
        if (existingStep.result === LoanStepResult.FAIL) {
          // Previous failure - update loan status
          loan.status = LoanStatus.REJECTED;
          loan.currentStage = null;
          await this.loanRepository.save(loan);
          return loan;
        }
        if (existingStep.result === LoanStepResult.MANUAL_REVIEW) {
          loan.status = LoanStatus.MANUAL_REVIEW;
          loan.currentStage = null;
          await this.loanRepository.save(loan);
          return loan;
        }
        // PASS - continue to next step
        continue;
      }

      // Execute the step
      const processor = this.stepProcessors.get(stepType);
      if (!processor) {
        throw new Error(`No processor registered for step type: ${stepType}`);
      }

      const result = processor.execute(loan);

      // Save step result
      await this.saveStepResult(loan, stepType, result);

      // Save history entry
      await this.saveHistoryEntry(loan, stepType, result);

      // Handle step result
      if (result.result === LoanStepResult.FAIL) {
        loan.status = LoanStatus.REJECTED;
        loan.currentStage = null;
        await this.loanRepository.save(loan);
        return loan;
      }

      if (result.result === LoanStepResult.MANUAL_REVIEW) {
        loan.status = LoanStatus.MANUAL_REVIEW;
        loan.currentStage = null;
        await this.loanRepository.save(loan);
        return loan;
      }

      // PASS - update currentStage and continue
      loan.currentStage = stepType;
      await this.loanRepository.save(loan);
    }

    // All steps passed - loan is approved
    loan.status = LoanStatus.APPROVED;
    loan.currentStage = null;
    await this.loanRepository.save(loan);

    // Save final approval history
    const history = this.historyRepository.create({
      loanId: loan.id,
      stage: LoanStepType.VALIDATION,
      result: LoanStepResult.PASS,
      reason: 'Application approved - all steps passed',
      timestamp: new Date(),
    });
    await this.historyRepository.save(history);

    return loan;
  }

  /**
   * Determine workflow steps based on loan type and amount.
   * This method makes the workflow configurable without code changes.
   */
  private getWorkflowSteps(loan: Loan): LoanStepType[] {
    const threshold = this.rulesService.getManagerApprovalThreshold();

    if (loan.loanType === LoanType.PERSONAL) {
      const steps: LoanStepType[] = [
        LoanStepType.VALIDATION,
        LoanStepType.FRAUD_CHECK,
        LoanStepType.CREDIT_CHECK,
      ];

      // PERSONAL loans with high amount need final approval
      if (loan.amount > threshold) {
        steps.push(LoanStepType.FINAL_APPROVAL);
      }

      return steps;
    }

    // BUSINESS loans always include guarantor check
    const steps: LoanStepType[] = [
      LoanStepType.VALIDATION,
      LoanStepType.FRAUD_CHECK,
      LoanStepType.GUARANTOR_CHECK,
      LoanStepType.CREDIT_CHECK,
    ];

    // BUSINESS loans with high amount also need final approval
    if (loan.amount > threshold) {
      steps.push(LoanStepType.FINAL_APPROVAL);
    }

    return steps;
  }

  private async findCompletedStep(
    loanId: number,
    stepType: LoanStepType,
  ): Promise<LoanStep | null> {
    return this.stepRepository.findOne({
      where: {
        loanId,
        type: stepType,
        status: LoanStepStatus.COMPLETED,
      },
    });
  }

  private async saveStepResult(
    loan: Loan,
    stepType: LoanStepType,
    result: { result: LoanStepResult; failureReason?: any; reason?: string },
  ): Promise<void> {
    // Create or update step record
    const existingPending = await this.stepRepository.findOne({
      where: {
        loanId: loan.id,
        type: stepType,
        status: LoanStepStatus.PENDING,
      },
    });

    if (existingPending) {
      existingPending.status =
        result.result === LoanStepResult.PASS
          ? LoanStepStatus.COMPLETED
          : result.result === LoanStepResult.FAIL
            ? LoanStepStatus.FAILED
            : LoanStepStatus.MANUAL_REVIEW;
      existingPending.result = result.result;
      existingPending.failureReason = result.failureReason ?? null;
      existingPending.reason = result.reason ?? null;
      existingPending.startedAt = new Date();
      existingPending.completedAt = new Date();
      await this.stepRepository.save(existingPending);
    } else {
      const step = this.stepRepository.create({
        loanId: loan.id,
        type: stepType,
        status:
          result.result === LoanStepResult.PASS
            ? LoanStepStatus.COMPLETED
            : result.result === LoanStepResult.FAIL
              ? LoanStepStatus.FAILED
              : LoanStepStatus.MANUAL_REVIEW,
        result: result.result,
        failureReason: result.failureReason ?? null,
        reason: result.reason ?? null,
        startedAt: new Date(),
        completedAt: new Date(),
      });
      await this.stepRepository.save(step);
    }
  }

  private async saveHistoryEntry(
    loan: Loan,
    stepType: LoanStepType,
    result: { result: LoanStepResult; failureReason?: any; reason?: string },
  ): Promise<void> {
    const history = this.historyRepository.create({
      loanId: loan.id,
      stage: stepType,
      result: result.result,
      reason: result.reason ?? null,
      timestamp: new Date(),
    });
    await this.historyRepository.save(history);
  }
}
