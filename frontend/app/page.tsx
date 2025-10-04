'use client';

import { useReadContract } from 'wagmi';
import { CONTRACTS, RWA_VAULT_ABI, TRANCHE_ABI } from '@/lib/contracts';
import { formatUnits } from 'viem';

export default function Dashboard() {
  // Read total value locked
  const { data: tvl } = useReadContract({
    address: CONTRACTS.RWA_VAULT,
    abi: RWA_VAULT_ABI,
    functionName: 'getTotalValueLocked',
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

  const formatAmount = (amount: bigint | undefined) => {
    if (!amount) return '0.00';
    return parseFloat(formatUnits(amount, 6)).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Faucet Banner */}
      <div className="bg-gradient-to-r from-primary-500 to-blue-500 rounded-lg shadow-lg p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">💧 Need Test USDC?</h2>
            <p className="text-primary-100">
              Get free test USDC tokens to try out all platform features on Sepolia testnet
            </p>
          </div>
          <a
            href="/faucet"
            className="bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
          >
            Go to Faucet →
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Value Locked */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-primary-500">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
            Total Value Locked
          </h3>
          <p className="text-3xl font-bold text-gray-900">
            ${formatAmount(tvl)}
          </p>
          <p className="text-sm text-gray-500 mt-1">USDC</p>
        </div>

        {/* Senior Tranche */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
            Senior Tranche Supply
          </h3>
          <p className="text-3xl font-bold text-gray-900">
            ${formatAmount(seniorSupply)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Fixed 8% APY</p>
        </div>

        {/* Junior Tranche */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
            Junior Tranche Supply
          </h3>
          <p className="text-3xl font-bold text-gray-900">
            ${formatAmount(juniorSupply)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Variable Returns</p>
        </div>
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Senior Tranche
          </h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Fixed 8% APY returns
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Lower risk profile
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Priority in capital distribution
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Ideal for conservative investors
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Junior Tranche
          </h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">✓</span>
              Variable returns based on performance
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">✓</span>
              Higher potential returns
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">✓</span>
              Absorbs first-loss capital
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">✓</span>
              Ideal for risk-tolerant investors
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
