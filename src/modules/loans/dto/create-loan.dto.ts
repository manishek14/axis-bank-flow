import {
  IsString,
  IsNumber,
  IsEnum,
  IsBoolean,
  Min,
  Max,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import { LoanType } from '@/common/enums/loan-type';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLoanDto {
  @ApiProperty({ example: 'C-1001', description: 'Customer identifier' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ example: 400000000, description: 'Loan amount' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    example: '09121234567',
    description: 'Mobile phone number (11 digits starting with 09)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^09\d{9}$/)
  phone: string;

  @ApiProperty({
    enum: LoanType,
    example: LoanType.PERSONAL,
    description: 'Loan type: PERSONAL or BUSINESS',
  })
  @IsEnum(LoanType)
  loanType: LoanType;

  @ApiProperty({ example: 50000000, description: 'Monthly income' })
  @IsNumber()
  @Min(0)
  monthlyIncome: number;

  @ApiProperty({
    example: 720,
    description: 'Credit score (0-1000)',
  })
  @IsNumber()
  @Min(0)
  @Max(1000)
  creditScore: number;

  @ApiProperty({
    example: false,
    description: 'Whether the applicant has a guarantor',
  })
  @IsBoolean()
  hasGuarantor: boolean;
}
