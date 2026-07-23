import { LoanStatus } from '@/common/enums/loan-status';
import { LoanStepType } from '@/common/enums/loan-step-type';
import { ApiProperty } from '@nestjs/swagger';

export class ProcessResponseDto {
  @ApiProperty({ example: 'L-10001' })
  loanId: string;

  @ApiProperty({ enum: LoanStatus, example: LoanStatus.APPROVED })
  status: LoanStatus;

  @ApiProperty({ enum: LoanStepType, nullable: true })
  currentStage: LoanStepType | null;
}
