import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { HistoryType } from '@/common/enums/history-type';
import { LoanStepType } from '@/common/enums/loan-step-type';
import { LoanStepResult } from '@/common/enums/loan-step-result';
import { Loan } from './loan.entity';

@Entity('loan_histories')
export class LoanHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Loan, (loan) => loan.histories, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'loanId' })
  loan: Loan;

  @Column({ name: 'loanId' })
  loanId: number;

  @Index()
  @Column({ type: 'enum', enum: LoanStepType })
  stage: LoanStepType;

  @Column({ type: 'enum', enum: LoanStepResult })
  result: LoanStepResult;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  timestamp: Date;
}
