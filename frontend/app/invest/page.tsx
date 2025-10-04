'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import axios from 'axios';
import { CONTRACTS, USDC_ABI, RWA_VAULT_ABI, Tranche } from '@/lib/contracts';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function Invest() {
  const { address, isConnected } = useAccount();
  const [selectedTranche, setSelectedTranche] = useState<Tranche>(Tranche.SENIOR);
  const [amount, setAmount] = useState('');
  const [kycStatus, setKycStatus] = useState<'unknown' | 'pending' | 'approved' | 'rejected'>('unknown');
  const [isCheckingKYC, setIsCheckingKYC] = useState(false);

  // Read user's USDC balance
  const { data: usdcBalance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Read current USDC allowance
  const { data: allowance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.RWA_VAULT] : undefined,
  });

  // Read deposit fee (ORIGINATION_FEE_BPS = 200 = 2%)
  const { data: depositFee } = useReadContract({
    address: CONTRACTS.RWA_VAULT,
    abi: RWA_VAULT_ABI,
    functionName: 'ORIGINATION_FEE_BPS',
  });

  // Write contracts
  const {
    writeContract: approveUSDC,
    data: approveHash,
    isPending: isApprovePending
  } = useWriteContract();

  const {
    writeContract: deposit,
    data: depositHash,
    isPending: isDepositPending
  } = useWriteContract();

  // Wait for transactions
  const { isLoading: isApproveLoading, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  const { isLoading: isDepositLoading, isSuccess: isDepositSuccess } =
    useWaitForTransactionReceipt({ hash: depositHash });

  // Check KYC status from backend
  const checkKYCStatus = async () => {
    if (!address) return;

    setIsCheckingKYC(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/kyc/request`, { wallet: address });
      setKycStatus(response.data.kycStatus);
    } catch (error) {
      console.error('Error checking KYC status:', error);
      setKycStatus('unknown');
    } finally {
      setIsCheckingKYC(false);
    }
  };

  // Request KYC
  const requestKYC = async () => {
    if (!address) return;

    try {
      const response = await axios.post(`${BACKEND_URL}/kyc/request`, { wallet: address });
      if (response.data.kycStatus === 'approved') {
        alert('KYC approved! You can now invest.');
        setKycStatus('approved');
      } else {
        alert('KYC request submitted! You will be notified once approved.');
        setKycStatus('pending');
      }
    } catch (error) {
      console.error('Error requesting KYC:', error);
      alert('Failed to submit KYC request. Please try again.');
    }
  };

  // Calculate fee and net amount
  const calculateAmounts = () => {
    if (!amount || !depositFee) return { fee: '0', netAmount: '0' };

    const amountBigInt = parseUnits(amount, 6);
    const feeAmount = (amountBigInt * depositFee) / BigInt(10000);
    const netAmount = amountBigInt - feeAmount;

    return {
      fee: formatUnits(feeAmount, 6),
      netAmount: formatUnits(netAmount, 6),
    };
  };

  const { fee, netAmount } = calculateAmounts();

  // Handle approve
  const handleApprove = async () => {
    if (!amount) return;

    try {
      const amountBigInt = parseUnits(amount, 6);
      approveUSDC({
        address: CONTRACTS.USDC,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [CONTRACTS.RWA_VAULT, amountBigInt],
      });
    } catch (error) {
      console.error('Error approving USDC:', error);
    }
  };

  // Handle deposit
  const handleDeposit = async () => {
    if (!amount) return;

    try {
      const amountBigInt = parseUnits(amount, 6);
      const toSenior = selectedTranche === Tranche.SENIOR;
      deposit({
        address: CONTRACTS.RWA_VAULT,
        abi: RWA_VAULT_ABI,
        functionName: 'deposit',
        args: [amountBigInt, toSenior],
      });
    } catch (error) {
      console.error('Error depositing:', error);
    }
  };

  const isAmountValid = amount && parseFloat(amount) > 0;
  const needsApproval = isAmountValid && allowance !== undefined &&
    parseUnits(amount, 6) > allowance;

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Connect Your Wallet</h1>
          <p className="text-gray-600 mb-6">
            Please connect your wallet to start investing in RWA tranches.
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (kycStatus === 'unknown') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Check KYC Status</h1>
          <p className="text-gray-600 mb-6">
            Please verify your KYC status before investing.
          </p>
          <button
            onClick={checkKYCStatus}
            disabled={isCheckingKYC}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {isCheckingKYC ? 'Checking...' : 'Check KYC Status'}
          </button>
        </div>
      </div>
    );
  }

  if (kycStatus !== 'approved') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">KYC Required</h1>
          <p className="text-gray-600 mb-6">
            {kycStatus === 'pending'
              ? 'Your KYC is pending approval. Please wait for admin approval.'
              : 'You need to complete KYC verification before investing.'}
          </p>
          {kycStatus !== 'pending' && (
            <button
              onClick={requestKYC}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700"
            >
              Request KYC Approval
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Invest</h1>

      <div className="bg-white rounded-lg shadow-md p-8">
        {/* Tranche Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Tranche
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSelectedTranche(Tranche.SENIOR)}
              className={`p-4 border-2 rounded-lg transition-all ${
                selectedTranche === Tranche.SENIOR
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-green-300'
              }`}
            >
              <div className="font-semibold text-lg mb-1">Senior Tranche</div>
              <div className="text-sm text-gray-600">Fixed 8% APY</div>
              <div className="text-xs text-gray-500 mt-1">Lower Risk</div>
            </button>

            <button
              onClick={() => setSelectedTranche(Tranche.JUNIOR)}
              className={`p-4 border-2 rounded-lg transition-all ${
                selectedTranche === Tranche.JUNIOR
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-300'
              }`}
            >
              <div className="font-semibold text-lg mb-1">Junior Tranche</div>
              <div className="text-sm text-gray-600">Variable Returns</div>
              <div className="text-xs text-gray-500 mt-1">Higher Risk</div>
            </button>
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Investment Amount (USDC)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <div className="text-sm text-gray-500 mt-1">
            Balance: {usdcBalance ? formatUnits(usdcBalance, 6) : '0.00'} USDC
          </div>
        </div>

        {/* Fee Preview */}
        {isAmountValid && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Deposit Amount:</span>
              <span className="font-medium">{amount} USDC</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Fee (2%):</span>
              <span className="font-medium text-red-600">-{fee} USDC</span>
            </div>
            <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-200">
              <span>Net Investment:</span>
              <span className="text-green-600">{netAmount} USDC</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {needsApproval && (
            <button
              onClick={handleApprove}
              disabled={isApprovePending || isApproveLoading}
              className="w-full bg-yellow-600 text-white py-3 rounded-lg font-medium hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isApprovePending || isApproveLoading
                ? 'Approving...'
                : 'Approve USDC'}
            </button>
          )}

          <button
            onClick={handleDeposit}
            disabled={
              !isAmountValid ||
              needsApproval ||
              isDepositPending ||
              isDepositLoading
            }
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isDepositPending || isDepositLoading
              ? 'Depositing...'
              : 'Deposit'}
          </button>
        </div>

        {/* Transaction Status */}
        {isApproveSuccess && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
            Approval successful! You can now deposit.
          </div>
        )}

        {isDepositSuccess && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
            Deposit successful! Check your portfolio to see your investment.
          </div>
        )}
      </div>
    </div>
  );
}
