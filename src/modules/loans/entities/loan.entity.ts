import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LoanStatus } from '@/common/enums/loan-status';
import { LoanType } from '@/common/enums/loan-type';
import { LoanStepType } from '@/common/enums/loan-step-type';
import { LoanStep } from './loan-step.entity';
import { LoanHistory } from './loan-history.entity';

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20, unique: true })
  loanId: string;

  @Column({ type: 'varchar', length: 50 })
  customerId: string;

  @Column({ type: 'bigint' })
  amount: number;

  @Column({ type: 'varchar', length: 11 })
  phone: string;

  @Column({ type: 'enum', enum: LoanType })
  loanType: LoanType;

  @Column({ type: 'bigint', default: 0 })
  monthlyIncome: number;

  @Column({ type: 'int', default: 0 })
  creditScore: number;

  @Column({ type: 'boolean', default: false })
  hasGuarantor: boolean;

  @Index()
  @Column({
    type: 'enum',
    enum: LoanStatus,
    default: LoanStatus.SUBMITTED,
  })
  status: LoanStatus;

  @Column({
    type: 'enum',
    enum: LoanStepType,
    nullable: true,
  })
  currentStage: LoanStepType | null;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @OneToMany(() => LoanStep, (step) => step.loan)
  steps: LoanStep[];

  @OneToMany(() => LoanHistory, (history) => history.loan)
  histories: LoanHistory[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
