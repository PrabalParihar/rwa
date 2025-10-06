'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CONTRACTS, USDC_ABI } from '@/lib/contracts';

export default function Faucet() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('1000');
  const [isMinting, setIsMinting] = useState(false);

  // Read user's USDC balance
  const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Write contract for minting
  const {
    writeContract: mintUSDC,
    data: mintHash,
    isPending: isMintPending,
    error: mintError,
  } = useWriteContract();

  const { isLoading: isMintLoading, isSuccess: isMintSuccess } =
    useWaitForTransactionReceipt({ hash: mintHash });

  // Handle mint
  const handleMint = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      setIsMinting(true);
      const amountBigInt = parseUnits(amount, 6);

      // Mint USDC to connected wallet
      mintUSDC({
        address: CONTRACTS.USDC,
        abi: [
          {
            inputs: [
              { name: 'to', type: 'address' },
              { name: 'amount', type: 'uint256' },
            ],
            name: 'mint',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
          },
        ] as const,
        functionName: 'mint',
        args: [address as `0x${string}`, amountBigInt],
      });
    } catch (error) {
      console.error('Error minting USDC:', error);
      alert('Failed to mint USDC. Please try again.');
      setIsMinting(false);
    }
  };

  // Handle success
  if (isMintSuccess && isMinting) {
    setIsMinting(false);
    refetchBalance();
  }

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <h1 className="text-3xl font-bold mb-4">USDC Faucet</h1>
          <p className="text-gray-600 mb-6">
            Connect your wallet to get test USDC.
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">USDC Faucet</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="mb-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold">Get Test USDC</h2>
            <div className="text-right">
              <p className="text-sm text-gray-600">Your Balance</p>
              <p className="text-2xl font-bold text-blue-600">
                {usdcBalance ? formatUnits(usdcBalance, 6) : '0.00'} USDC
              </p>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded mb-5">
            <p className="text-sm text-blue-900">
              Mint test USDC on Sepolia for deposits, investments, and invoice financing.
            </p>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium mb-2">
              Amount (USDC)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-2">
              Recommended: 1000-10000 USDC
            </p>
          </div>

          <button
            onClick={handleMint}
            disabled={isMintPending || isMintLoading || isMinting}
            className="w-full bg-blue-600 text-white py-2.5 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isMintPending || isMintLoading || isMinting ? 'Minting...' : 'Mint USDC'}
          </button>

          {isMintSuccess && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
              Successfully minted {amount} USDC!
            </div>
          )}

          {mintError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
              Error minting USDC. Please try again.
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="border-t pt-5">
          <h3 className="text-lg font-semibold mb-4">Quick Amounts</h3>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setAmount('1000')}
              className="px-3 py-2 border-2 border-gray-300 rounded hover:border-blue-500 hover:bg-blue-50"
            >
              <div className="font-semibold">1,000</div>
              <div className="text-xs text-gray-600">Small</div>
            </button>

            <button
              onClick={() => setAmount('5000')}
              className="px-3 py-2 border-2 border-gray-300 rounded hover:border-blue-500 hover:bg-blue-50"
            >
              <div className="font-semibold">5,000</div>
              <div className="text-xs text-gray-600">Medium</div>
            </button>

            <button
              onClick={() => setAmount('10000')}
              className="px-3 py-2 border-2 border-gray-300 rounded hover:border-blue-500 hover:bg-blue-50"
            >
              <div className="font-semibold">10,000</div>
              <div className="text-xs text-gray-600">Large</div>
            </button>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-blue-50 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">What's Next</h2>
        <ul className="space-y-2 text-gray-700">
          <li>• Check your{' '}
            <a href="/invest" className="text-blue-600 hover:underline">
              KYC status
            </a>{' '}
            (auto-approved for testing)
          </li>
          <li>• Invest in Senior (8% APY) or Junior tranche</li>
          <li>• View your{' '}
            <a href="/portfolio" className="text-blue-600 hover:underline">
              portfolio
            </a>
          </li>
          <li>• Try{' '}
            <a href="/admin" className="text-blue-600 hover:underline">
              admin features
            </a>{' '}
            for invoice management
          </li>
        </ul>
      </div>
    </div>
  );
}
