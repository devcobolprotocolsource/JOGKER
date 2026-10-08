import { strings } from '../strings';

export type AppErrorCode =
  | 'SHIFT_NOT_OPEN'
  | 'OPEN_BILL_REMAINS'
  | 'ORDER_NOT_FOUND'
  | 'ORDER_STATUS_TRANSITION_INVALID'
  | 'PAYMENT_NOT_VERIFIED'
  | 'PAYMENT_TOTAL_MISMATCH'
  | 'VOUCHER_NOT_FOUND'
  | 'VOUCHER_INACTIVE'
  | 'VOUCHER_EXPIRED'
  | 'VOUCHER_QUOTA_EXCEEDED'
  | 'VOUCHER_MINIMUM_NOT_MET'
  | 'STOCK_INSUFFICIENT'
  | 'BILL_CLOSED'
  | 'REASON_REQUIRED'
  | 'NOT_AUTHORIZED'
  | 'STAFF_CREATE_INVALID'
  | 'STAFF_CREATE_UNAUTHORIZED'
  | 'STAFF_CREATE_FORBIDDEN'
  | 'STAFF_CREATE_METHOD_NOT_ALLOWED'
  | 'STAFF_CREATE_FAILED'
  | 'PAYMENT_ACCOUNT_NOT_FOUND'
  | 'PAYMENT_PROOF_TOO_LARGE'
  | 'PAYMENT_PROOF_TYPE_INVALID'
  | 'NETWORK_ERROR'
  | 'REQUEST_TIMEOUT'
  | 'UNKNOWN';

export interface AppError {
  code: AppErrorCode;
  message: string;
}

export function mapAppError(input: unknown): AppError {
  const message =
    typeof input === 'object' && input !== null && 'message' in input ? String(input.message) : '';
  const code = message in strings.errors ? (message as AppErrorCode) : 'UNKNOWN';
  return { code, message: strings.errors[code] };
}
