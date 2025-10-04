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
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">USDC Faucet</h1>
          <p className="text-gray-600 mb-6">
            Please connect your wallet to get test USDC tokens.
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">USDC Faucet</h1>

      <div className="bg-white rounded-lg shadow-md p-8 mb-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-gray-900">Get Test USDC</h2>
            <div className="text-right">
              <p className="text-sm text-gray-600">Your Balance</p>
              <p className="text-2xl font-bold text-primary-600">
                {usdcBalance ? formatUnits(usdcBalance, 6) : '0.00'} USDC
              </p>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 About the Faucet</h3>
            <p className="text-xs text-blue-800">
              This is a test USDC faucet on Sepolia testnet. You can mint any amount of USDC to test
              the RWA platform features including deposits, investments, and invoice financing.
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (USDC)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-2">
              Recommended: 1000-10000 USDC for testing
            </p>
          </div>

          <button
            onClick={handleMint}
            disabled={isMintPending || isMintLoading || isMinting}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isMintPending || isMintLoading || isMinting ? 'Minting...' : 'Mint USDC'}
          </button>

          {isMintSuccess && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
              ✅ Successfully minted {amount} USDC! Your balance has been updated.
            </div>
          )}

          {mintError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              ❌ Error minting USDC. Please try again.
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setAmount('1000')}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              <div className="font-semibold">1,000 USDC</div>
              <div className="text-xs text-gray-600">Small Test</div>
            </button>

            <button
              onClick={() => setAmount('5000')}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              <div className="font-semibold">5,000 USDC</div>
              <div className="text-xs text-gray-600">Medium Test</div>
            </button>

            <button
              onClick={() => setAmount('10000')}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              <div className="font-semibold">10,000 USDC</div>
              <div className="text-xs text-gray-600">Large Test</div>
            </button>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">🚀 Next Steps</h2>
        <div className="space-y-3 text-gray-700">
          <div className="flex items-start">
            <span className="font-bold text-primary-600 mr-3">1.</span>
            <p>
              <strong>Mint USDC</strong> - Get test tokens using the form above
            </p>
          </div>
          <div className="flex items-start">
            <span className="font-bold text-primary-600 mr-3">2.</span>
            <p>
              <strong>Check KYC Status</strong> - Go to{' '}
              <a href="/invest" className="text-primary-600 hover:underline">
                Invest Page
              </a>{' '}
              and verify your KYC (auto-approved)
            </p>
          </div>
          <div className="flex items-start">
            <span className="font-bold text-primary-600 mr-3">3.</span>
            <p>
              <strong>Make a Deposit</strong> - Choose Senior (8% APY) or Junior (variable) tranche
            </p>
          </div>
          <div className="flex items-start">
            <span className="font-bold text-primary-600 mr-3">4.</span>
            <p>
              <strong>View Portfolio</strong> - Check your investments at{' '}
              <a href="/portfolio" className="text-primary-600 hover:underline">
                Portfolio Page
              </a>
            </p>
          </div>
          <div className="flex items-start">
            <span className="font-bold text-primary-600 mr-3">5.</span>
            <p>
              <strong>Admin Features</strong> - Mint Invoice NFTs at{' '}
              <a href="/admin" className="text-primary-600 hover:underline">
                Admin Page
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
