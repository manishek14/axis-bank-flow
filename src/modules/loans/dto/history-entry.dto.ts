import { LoanStepType } from '@/common/enums/loan-step-type';
import { LoanStepResult } from '@/common/enums/loan-step-result';
import { ApiProperty } from '@nestjs/swagger';

export class HistoryEntryDto {
  @ApiProperty({ enum: LoanStepType, example: LoanStepType.VALIDATION })
  stage: LoanStepType;

  @ApiProperty({ enum: LoanStepResult, example: LoanStepResult.PASS })
  result: LoanStepResult;

  @ApiProperty({ example: '2026-07-15T10:00:00Z' })
  timestamp: string;

  @ApiProperty({ example: 'SUCCESS', nullable: true })
  reason: string | null;
}
