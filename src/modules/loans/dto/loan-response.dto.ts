import { LoanStatus } from '@/common/enums/loan-status';
import { LoanStepType } from '@/common/enums/loan-step-type';
import { LoanType } from '@/common/enums/loan-type';
import { ApiProperty } from '@nestjs/swagger';

export class LoanResponseDto {
  @ApiProperty({ example: 'L-10001' })
  loanId: string;

  @ApiProperty({ example: 'C-1001' })
  customerId: string;

  @ApiProperty({ example: 400000000 })
  amount: number;

  @ApiProperty({ example: '09121234567' })
  phone: string;

  @ApiProperty({ enum: LoanType, example: LoanType.PERSONAL })
  loanType: LoanType;

  @ApiProperty({ example: 50000000 })
  monthlyIncome: number;

  @ApiProperty({ example: 720 })
  creditScore: number;

  @ApiProperty({ example: false })
  hasGuarantor: boolean;

  @ApiProperty({ enum: LoanStatus, example: LoanStatus.SUBMITTED })
  status: LoanStatus;

  @ApiProperty({ enum: LoanStepType, example: LoanStepType.VALIDATION, nullable: true })
  currentStage: LoanStepType | null;

  @ApiProperty({ example: '2026-07-15T10:00:00Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-07-15T10:00:03Z' })
  updatedAt: string;
}
