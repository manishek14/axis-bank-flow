import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LoanStepType } from '@/common/enums/loan-step-type';
import { LoanStepStatus } from '@/common/enums/loan-step-status';
import { LoanStepResult } from '@/common/enums/loan-step-result';
import { FailureReason } from '@/common/enums/failure-reason';
import { Loan } from './loan.entity';

@Entity('loan_steps')
export class LoanStep {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Loan, (loan) => loan.steps, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'loanId' })
  loan: Loan;

  @Column({ name: 'loanId' })
  loanId: number;

  @Index()
  @Column({ type: 'enum', enum: LoanStepType })
  type: LoanStepType;

  @Index()
  @Column({
    type: 'enum',
    enum: LoanStepStatus,
    default: LoanStepStatus.PENDING,
  })
  status: LoanStepStatus;

  @Column({
    type: 'enum',
    enum: LoanStepResult,
    nullable: true,
  })
  result: LoanStepResult | null;

  @Column({
    type: 'enum',
    enum: FailureReason,
    nullable: true,
  })
  failureReason: FailureReason | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
