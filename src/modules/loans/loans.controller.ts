import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { LoansService } from './loans.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { CancelLoanDto } from './dto/cancel-loan.dto';
import { ResumeLoanDto } from './dto/resume-loan.dto';
import { LoanQueryDto } from './dto/loan-query.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Loans')
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new loan application' })
  @ApiResponse({ status: 201, description: 'Loan created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  create(@Body() createLoanDto: CreateLoanDto) {
    return this.loansService.create(createLoanDto);
  }

  @Post(':loanId/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process loan workflow' })
  @ApiResponse({ status: 200, description: 'Workflow processed' })
  @ApiResponse({ status: 404, description: 'Loan not found' })
  process(@Param('loanId') loanId: string) {
    return this.loansService.process(loanId);
  }

  @Get(':loanId')
  @ApiOperation({ summary: 'Get loan details' })
  @ApiResponse({ status: 200, description: 'Loan details' })
  @ApiResponse({ status: 404, description: 'Loan not found' })
  findOne(@Param('loanId') loanId: string) {
    return this.loansService.findOne(loanId);
  }

  @Get(':loanId/history')
  @ApiOperation({ summary: 'Get loan processing history' })
  @ApiResponse({ status: 200, description: 'Loan history' })
  @ApiResponse({ status: 404, description: 'Loan not found' })
  getHistory(@Param('loanId') loanId: string) {
    return this.loansService.getHistory(loanId);
  }

  @Post(':loanId/cancel')
  @ApiOperation({ summary: 'Cancel a loan application' })
  @ApiResponse({ status: 200, description: 'Loan cancelled' })
  cancel(@Param('loanId') loanId: string, @Body() cancelDto: CancelLoanDto) {
    return this.loansService.cancel(loanId, cancelDto);
  }

  @Post(':loanId/resume')
  @ApiOperation({ summary: 'Resume a failed loan application' })
  @ApiResponse({ status: 200, description: 'Loan resumed' })
  resume(@Param('loanId') loanId: string, @Body() resumeDto: ResumeLoanDto) {
    return this.loansService.resume(loanId, resumeDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all loan applications' })
  findAll(@Query() query: LoanQueryDto) {
    return this.loansService.findAll(query);
  }
}
