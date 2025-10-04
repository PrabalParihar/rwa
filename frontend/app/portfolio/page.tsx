'use client';

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits } from 'viem';
import { CONTRACTS, TRANCHE_ABI, RWA_VAULT_ABI, Tranche } from '@/lib/contracts';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState } from 'react';

export default function Portfolio() {
  const { address, isConnected } = useAccount();
  const [withdrawAmount, setWithdrawAmount] = useState<{ tranche: Tranche; shares: bigint } | null>(null);

  // Read senior tranche balance
  const { data: seniorBalance } = useReadContract({
    address: CONTRACTS.SENIOR_TRANCHE,
    abi: TRANCHE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Read junior tranche balance
  const { data: juniorBalance } = useReadContract({
    address: CONTRACTS.JUNIOR_TRANCHE,
    abi: TRANCHE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Read senior tranche total supply
  const { data: seniorSupply } = useReadContract({
    address: CONTRACTS.SENIOR_TRANCHE,
    abi: TRANCHE_ABI,
    functionName: 'totalSupply',
  });

  // Read junior tranche total supply
  const { data: juniorSupply } = useReadContract({
    address: CONTRACTS.JUNIOR_TRANCHE,
    abi: TRANCHE_ABI,
    functionName: 'totalSupply',
  });

  // Read total value locked
  const { data: tvl } = useReadContract({
    address: CONTRACTS.RWA_VAULT,
    abi: RWA_VAULT_ABI,
    functionName: 'getTotalValueLocked',
  });

  // Withdraw functionality
  const {
    writeContract: withdraw,
    data: withdrawHash,
    isPending: isWithdrawPending
  } = useWriteContract();

  const { isLoading: isWithdrawLoading, isSuccess: isWithdrawSuccess } =
    useWaitForTransactionReceipt({ hash: withdrawHash });

  const handleWithdraw = (tranche: Tranche, shares: bigint) => {
    if (shares === BigInt(0)) return;

    // Convert tranche enum to boolean (SENIOR = true, JUNIOR = false)
    const isSenior = tranche === Tranche.SENIOR;

    withdraw({
      address: CONTRACTS.RWA_VAULT,
      abi: RWA_VAULT_ABI,
      functionName: 'withdraw',
      args: [shares, isSenior],
    });

    setWithdrawAmount({ tranche, shares });
  };

  const formatAmount = (amount: bigint | undefined) => {
    if (!amount) return '0.00';
    return parseFloat(formatUnits(amount, 6)).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Calculate claimable amounts based on share proportion
  const calculateClaimable = (balance: bigint | undefined, supply: bigint | undefined) => {
    if (!balance || !supply || !tvl || supply === BigInt(0)) return BigInt(0);
    return (balance * tvl) / supply;
  };

  const seniorClaimable = calculateClaimable(seniorBalance, seniorSupply);
  const juniorClaimable = calculateClaimable(juniorBalance, juniorSupply);

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Connect Your Wallet</h1>
          <p className="text-gray-600 mb-6">
            Please connect your wallet to view your portfolio.
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Portfolio</h1>

      {/* Senior Tranche */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-l-4 border-green-500">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-1">Senior Tranche</h2>
            <p className="text-sm text-gray-500">Fixed 8% APY - Lower Risk</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Balance</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatAmount(seniorBalance)} shares
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">Claimable Value</div>
            <div className="text-xl font-semibold text-green-600">
              ${formatAmount(seniorClaimable)} USDC
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">Share of Pool</div>
            <div className="text-xl font-semibold text-gray-900">
              {seniorSupply && seniorBalance
                ? ((Number(seniorBalance) / Number(seniorSupply)) * 100).toFixed(2)
                : '0.00'}%
            </div>
          </div>
        </div>

        {seniorBalance && seniorBalance > BigInt(0) && (
          <button
            onClick={() => handleWithdraw(Tranche.SENIOR, seniorBalance)}
            disabled={isWithdrawPending || isWithdrawLoading}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isWithdrawPending || isWithdrawLoading ? 'Withdrawing...' : 'Withdraw Senior Tranche'}
          </button>
        )}
      </div>

      {/* Junior Tranche */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-l-4 border-blue-500">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-1">Junior Tranche</h2>
            <p className="text-sm text-gray-500">Variable Returns - Higher Risk</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Balance</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatAmount(juniorBalance)} shares
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">Claimable Value</div>
            <div className="text-xl font-semibold text-blue-600">
              ${formatAmount(juniorClaimable)} USDC
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">Share of Pool</div>
            <div className="text-xl font-semibold text-gray-900">
              {juniorSupply && juniorBalance
                ? ((Number(juniorBalance) / Number(juniorSupply)) * 100).toFixed(2)
                : '0.00'}%
            </div>
          </div>
        </div>

        {juniorBalance && juniorBalance > BigInt(0) && (
          <button
            onClick={() => handleWithdraw(Tranche.JUNIOR, juniorBalance)}
            disabled={isWithdrawPending || isWithdrawLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isWithdrawPending || isWithdrawLoading ? 'Withdrawing...' : 'Withdraw Junior Tranche'}
          </button>
        )}
      </div>

      {/* Total Portfolio Value */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg shadow-md p-6 text-white">
        <h3 className="text-lg font-medium mb-2">Total Portfolio Value</h3>
        <div className="text-4xl font-bold">
          ${formatAmount(seniorClaimable + juniorClaimable)} USDC
        </div>
      </div>

      {/* Transaction Status */}
      {isWithdrawSuccess && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          Withdrawal successful! Your USDC has been transferred to your wallet.
        </div>
      )}

      {/* Empty State */}
      {(!seniorBalance || seniorBalance === BigInt(0)) &&
        (!juniorBalance || juniorBalance === BigInt(0)) && (
          <div className="mt-8 text-center py-12">
            <p className="text-gray-500 text-lg mb-4">
              You don't have any investments yet.
            </p>
            <a
              href="/invest"
              className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Start Investing
            </a>
          </div>
        )}
    </div>
  );
}
