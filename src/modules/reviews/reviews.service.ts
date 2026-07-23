import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from '@/modules/loans/entities/loan.entity';
import { LoanHistory } from '@/modules/loans/entities/loan-history.entity';
import { LoanStatus, LoanStepResult, LoanStepType } from '@/common/enums';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Loan)
    private loanRepository: Repository<Loan>,
    @InjectRepository(LoanHistory)
    private historyRepository: Repository<LoanHistory>,
  ) {}

  async getPendingReviews(): Promise<Loan[]> {
    return this.loanRepository.find({
      where: { status: LoanStatus.MANUAL_REVIEW },
      order: { createdAt: 'ASC' },
    });
  }

  async makeDecision(
    loanIdStr: string,
    approved: boolean,
    reason?: string,
  ): Promise<{ loanId: string; status: LoanStatus }> {
    const loan = await this.loanRepository.findOne({
      where: { loanId: loanIdStr },
    });

    if (!loan) {
      throw new NotFoundException({ error: 'LOAN_NOT_FOUND' });
    }

    if (loan.status !== LoanStatus.MANUAL_REVIEW) {
      throw new ConflictException(
        `Loan is not in MANUAL_REVIEW status. Current status: ${loan.status}`,
      );
    }

    // Update loan status based on reviewer decision
    loan.status = approved ? LoanStatus.APPROVED : LoanStatus.REJECTED;
    loan.currentStage = null;
    await this.loanRepository.save(loan);

    // Add history entry
    const history = this.historyRepository.create({
      loanId: loan.id,
      stage: LoanStepType.FINAL_APPROVAL,
      result: approved ? LoanStepResult.PASS : LoanStepResult.FAIL,
      reason: reason ?? (approved ? 'Approved by reviewer' : 'Rejected by reviewer'),
      timestamp: new Date(),
    });
    await this.historyRepository.save(history);

    return {
      loanId: loan.loanId,
      status: loan.status,
    };
  }
}
