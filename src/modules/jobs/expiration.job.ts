import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Loan } from '@/modules/loans/entities/loan.entity';
import { LoanHistory } from '@/modules/loans/entities/loan-history.entity';
import { LoanStatus, LoanStepResult, LoanStepType } from '@/common/enums';

/**
 * Background job service for handling loan expiration.
 * Dual expiration policy:
 * - First level: 7 days for fixing deficiencies (WAITING_FOR_USER → EXPIRED)
 * - Second level: 30 days for final removal (any active → EXPIRED)
 */
@Injectable()
export class ExpirationJobService {
  private readonly logger = new Logger(ExpirationJobService.name);

  constructor(
    @InjectRepository(Loan)
    private loanRepository: Repository<Loan>,
    @InjectRepository(LoanHistory)
    private historyRepository: Repository<LoanHistory>,
  ) {}

  /**
   * Check and expire loans that have exceeded their time limits.
   * This can be called by a BullMQ scheduled job or a simple interval.
   */
  async checkExpiredLoans(): Promise<number> {
    const now = new Date();

    // Expire WAITING_FOR_USER loans past 7-day limit
    const waitingExpired = await this.loanRepository.find({
      where: {
        status: LoanStatus.WAITING_FOR_USER,
        expiresAt: LessThan(now),
      },
    });

    // Expire IN_PROGRESS/SUBMITTED loans past 30-day limit
    const activeExpired = await this.loanRepository.find({
      where: {
        status: LoanStatus.IN_PROGRESS,
        expiresAt: LessThan(now),
      },
    });

    const allExpired = [...waitingExpired, ...activeExpired];

    for (const loan of allExpired) {
      loan.status = LoanStatus.EXPIRED;
      loan.currentStage = null;
      await this.loanRepository.save(loan);

      const history = this.historyRepository.create({
        loanId: loan.id,
        stage: LoanStepType.VALIDATION,
        result: LoanStepResult.FAIL,
        reason: 'Application expired due to time limit',
        timestamp: new Date(),
      });
      await this.historyRepository.save(history);

      this.logger.log(`Loan ${loan.loanId} expired`);
    }

    return allExpired.length;
  }
}
