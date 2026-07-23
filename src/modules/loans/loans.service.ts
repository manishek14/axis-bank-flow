import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Loan } from './entities/loan.entity';
import { LoanStep } from './entities/loan-step.entity';
import { LoanHistory } from './entities/loan-history.entity';
import { CreateLoanDto } from './dto/create-loan.dto';
import { LoanResponseDto } from './dto/loan-response.dto';
import { ProcessResponseDto } from './dto/process-response.dto';
import { HistoryEntryDto } from './dto/history-entry.dto';
import { CancelLoanDto } from './dto/cancel-loan.dto';
import { ResumeLoanDto } from './dto/resume-loan.dto';
import { LoanQueryDto } from './dto/loan-query.dto';
import {
  LoanStatus,
  LoanStepType,
  LoanStepStatus,
  LoanStepResult,
  TERMINAL_STATUSES,
} from '@/common/enums';
import { WorkflowService } from '@/modules/processing/workflow.service';

@Injectable()
export class LoansService {
  private loanIdCounter = 10001;

  constructor(
    @InjectRepository(Loan)
    private loanRepository: Repository<Loan>,
    @InjectRepository(LoanStep)
    private stepRepository: Repository<LoanStep>,
    @InjectRepository(LoanHistory)
    private historyRepository: Repository<LoanHistory>,
    private dataSource: DataSource,
    private workflowService: WorkflowService,
  ) {}

  async create(dto: CreateLoanDto): Promise<LoanResponseDto> {
    const loanId = `L-${this.loanIdCounter++}`;

    const loan = this.loanRepository.create({
      loanId,
      customerId: dto.customerId,
      amount: dto.amount,
      phone: dto.phone,
      loanType: dto.loanType,
      monthlyIncome: dto.monthlyIncome,
      creditScore: dto.creditScore,
      hasGuarantor: dto.hasGuarantor,
      status: LoanStatus.SUBMITTED,
      currentStage: LoanStepType.VALIDATION,
      expiresAt: null,
    });

    const saved = await this.loanRepository.save(loan);

    // Create initial VALIDATION step
    const step = this.stepRepository.create({
      loanId: saved.id,
      type: LoanStepType.VALIDATION,
      status: LoanStepStatus.PENDING,
      result: null,
      failureReason: null,
      reason: null,
      startedAt: null,
      completedAt: null,
    });
    await this.stepRepository.save(step);

    // Create initial history entry
    const history = this.historyRepository.create({
      loanId: saved.id,
      stage: LoanStepType.VALIDATION,
      result: LoanStepResult.PASS,
      reason: 'Application submitted successfully',
      timestamp: new Date(),
    });
    await this.historyRepository.save(history);

    return this.toResponseDto(saved);
  }

  async process(loanIdStr: string): Promise<ProcessResponseDto> {
    const loan = await this.findByLoanId(loanIdStr);

    // Idempotent: if already in terminal status, return current status
    if (TERMINAL_STATUSES.includes(loan.status)) {
      return {
        loanId: loan.loanId,
        status: loan.status,
        currentStage: loan.currentStage,
      };
    }

    // Execute workflow synchronously
    const result = await this.workflowService.executeWorkflow(loan);

    return {
      loanId: result.loanId,
      status: result.status,
      currentStage: result.currentStage,
    };
  }

  async findOne(loanIdStr: string): Promise<LoanResponseDto> {
    const loan = await this.findByLoanId(loanIdStr);
    return this.toResponseDto(loan);
  }

  async getHistory(loanIdStr: string): Promise<HistoryEntryDto[]> {
    const loan = await this.findByLoanId(loanIdStr);

    const histories = await this.historyRepository.find({
      where: { loanId: loan.id },
      order: { timestamp: 'ASC' },
    });

    return histories.map((h) => ({
      stage: h.stage,
      result: h.result,
      timestamp: h.timestamp.toISOString(),
      reason: h.reason,
    }));
  }

  async cancel(loanIdStr: string, dto: CancelLoanDto): Promise<LoanResponseDto> {
    const loan = await this.findByLoanId(loanIdStr);

    if (TERMINAL_STATUSES.includes(loan.status)) {
      throw new ConflictException(
        `Cannot cancel loan in terminal status: ${loan.status}`,
      );
    }

    loan.status = LoanStatus.CANCELLED;
    loan.currentStage = null;
    await this.loanRepository.save(loan);

    // Add history
    const history = this.historyRepository.create({
      loanId: loan.id,
      stage: loan.currentStage ?? LoanStepType.VALIDATION,
      result: LoanStepResult.FAIL,
      reason: dto.reason ?? 'Application cancelled by user',
      timestamp: new Date(),
    });
    await this.historyRepository.save(history);

    return this.toResponseDto(loan);
  }

  async resume(loanIdStr: string, dto: ResumeLoanDto): Promise<ProcessResponseDto> {
    const loan = await this.findByLoanId(loanIdStr);

    if (loan.status !== LoanStatus.WAITING_FOR_USER) {
      throw new ConflictException(
        `Cannot resume loan in status: ${loan.status}. Only WAITING_FOR_USER status can be resumed.`,
      );
    }

    // Update guarantor if provided
    if (dto.hasGuarantor !== undefined) {
      loan.hasGuarantor = dto.hasGuarantor;
    }

    // Add history for resume
    const history = this.historyRepository.create({
      loanId: loan.id,
      stage: loan.currentStage ?? LoanStepType.VALIDATION,
      result: LoanStepResult.PASS,
      reason: dto.note ?? 'User resumed application',
      timestamp: new Date(),
    });
    await this.historyRepository.save(history);

    // Continue workflow from current step
    loan.status = LoanStatus.IN_PROGRESS;
    await this.loanRepository.save(loan);

    const result = await this.workflowService.executeWorkflow(loan);

    return {
      loanId: result.loanId,
      status: result.status,
      currentStage: result.currentStage,
    };
  }

  async findAll(query: LoanQueryDto): Promise<{ data: LoanResponseDto[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (query.status) {
      where.status = query.status;
    }

    const [loans, total] = await this.loanRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (query.page! - 1) * query.limit!,
      take: query.limit!,
    });

    return {
      data: loans.map((l) => this.toResponseDto(l)),
      total,
    };
  }

  private async findByLoanId(loanIdStr: string): Promise<Loan> {
    const loan = await this.loanRepository.findOne({
      where: { loanId: loanIdStr },
    });

    if (!loan) {
      throw new NotFoundException({
        error: 'LOAN_NOT_FOUND',
      });
    }

    return loan;
  }

  private toResponseDto(loan: Loan): LoanResponseDto {
    return {
      loanId: loan.loanId,
      customerId: loan.customerId,
      amount: loan.amount,
      phone: loan.phone,
      loanType: loan.loanType,
      monthlyIncome: loan.monthlyIncome,
      creditScore: loan.creditScore,
      hasGuarantor: loan.hasGuarantor,
      status: loan.status,
      currentStage: loan.currentStage,
      createdAt: loan.createdAt.toISOString(),
      updatedAt: loan.updatedAt.toISOString(),
    };
  }
}
