/**
 * Workflow step types - combined from PDF + FinalApproval (human) replacing ManagerApproval
 */
export enum LoanStepType {
  VALIDATION = 'VALIDATION',
  FRAUD_CHECK = 'FRAUD_CHECK',
  GUARANTOR_CHECK = 'GUARANTOR_CHECK',
  CREDIT_CHECK = 'CREDIT_CHECK',
  FINAL_APPROVAL = 'FINAL_APPROVAL',
}
