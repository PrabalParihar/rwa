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
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="bg-blue-600 rounded-lg shadow p-5 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-1">Need Test USDC?</h2>
            <p className="text-sm">
              Get free test tokens for Sepolia testnet
            </p>
          </div>
          <a
            href="/faucet"
            className="bg-white text-blue-600 px-4 py-2 rounded font-semibold hover:bg-gray-100"
          >
            Faucet →
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="bg-white rounded-lg shadow p-5 border-l-4 border-blue-500">
          <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">
            Total Value Locked
          </h3>
          <p className="text-3xl font-bold">
            ${formatAmount(tvl)}
          </p>
          <p className="text-sm text-gray-500 mt-1">USDC</p>
        </div>

        <div className="bg-white rounded-lg shadow p-5 border-l-4 border-green-500">
          <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">
            Senior Tranche
          </h3>
          <p className="text-3xl font-bold">
            ${formatAmount(seniorSupply)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Fixed 8% APY</p>
        </div>

        <div className="bg-white rounded-lg shadow p-5 border-l-4 border-orange-500">
          <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">
            Junior Tranche
          </h3>
          <p className="text-3xl font-bold">
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
