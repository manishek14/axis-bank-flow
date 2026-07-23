/**
 * Loan application status - matches challenge PDF + Resume/Expiration extensions
 */
export enum LoanStatus {
  SUBMITTED = 'SUBMITTED',
  IN_PROGRESS = 'IN_PROGRESS',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
  WAITING_FOR_USER = 'WAITING_FOR_USER',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

/**
 * Terminal statuses - processing stops when loan reaches one of these
 */
export const TERMINAL_STATUSES: LoanStatus[] = [
  LoanStatus.APPROVED,
  LoanStatus.REJECTED,
  LoanStatus.MANUAL_REVIEW,
  LoanStatus.EXPIRED,
  LoanStatus.CANCELLED,
];
