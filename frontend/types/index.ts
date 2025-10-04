// KYC Status Types
export type KYCStatus = 'unknown' | 'pending' | 'approved' | 'rejected';

// Tranche Types (must match contract enum)
export enum TrancheType {
  SENIOR = 0,
  JUNIOR = 1,
}

// Transaction Status
export type TransactionStatus = 'idle' | 'pending' | 'confirming' | 'success' | 'error';

// User Portfolio
export interface UserPortfolio {
  seniorBalance: bigint;
  juniorBalance: bigint;
  seniorClaimable: bigint;
  juniorClaimable: bigint;
  totalValue: bigint;
}

// Vault Statistics
export interface VaultStats {
  totalValueLocked: bigint;
  seniorTotalSupply: bigint;
  juniorTotalSupply: bigint;
  depositFee: bigint;
}

// Investment Details
export interface InvestmentDetails {
  amount: string;
  tranche: TrancheType;
  fee: string;
  netAmount: string;
}

// KYC Request
export interface KYCRequest {
  address: string;
  status?: KYCStatus;
  requestedAt?: string;
  approvedAt?: string;
}

// Transaction
export interface Transaction {
  hash: string;
  status: TransactionStatus;
  type: 'approve' | 'deposit' | 'withdraw';
  amount?: string;
  tranche?: TrancheType;
  timestamp?: number;
}

// API Response
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Contract Addresses
export interface ContractAddresses {
  RWA_VAULT: `0x${string}`;
  USDC: `0x${string}`;
  SENIOR_TRANCHE: `0x${string}`;
  JUNIOR_TRANCHE: `0x${string}`;
}
