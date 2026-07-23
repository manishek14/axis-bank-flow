import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface ManualReviewConfig {
  minScore: number;
  maxScore: number;
}

export interface BusinessRules {
  minimumCreditScore: number;
  managerApprovalThreshold: number;
  incomeMultiplier: number;
  manualReview: ManualReviewConfig;
}

@Injectable()
export class BusinessRulesService {
  private rules: BusinessRules;

  constructor(private configService: ConfigService) {
    this.loadRules();
  }

  private loadRules(): void {
    const rulesPath = path.resolve(process.cwd(), 'rules.json');

    if (fs.existsSync(rulesPath)) {
      const raw = fs.readFileSync(rulesPath, 'utf-8');
      this.rules = JSON.parse(raw) as BusinessRules;
    } else {
      // Default fallback rules
      this.rules = {
        minimumCreditScore: 650,
        managerApprovalThreshold: 500000000,
        incomeMultiplier: 20,
        manualReview: {
          minScore: 500,
          maxScore: 649,
        },
      };
    }
  }

  getRules(): BusinessRules {
    return this.rules;
  }

  getMinimumCreditScore(): number {
    return this.rules.minimumCreditScore;
  }

  getManagerApprovalThreshold(): number {
    return this.rules.managerApprovalThreshold;
  }

  getIncomeMultiplier(): number {
    return this.rules.incomeMultiplier;
  }

  getManualReviewMinScore(): number {
    return this.rules.manualReview.minScore;
  }

  getManualReviewMaxScore(): number {
    return this.rules.manualReview.maxScore;
  }
}
