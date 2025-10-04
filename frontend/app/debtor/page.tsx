'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import axios from 'axios';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CONTRACTS, RWA_VAULT_ABI, USDC_ABI } from '@/lib/contracts';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface Invoice {
  id: string;
  amount: number;
  status: string;
  tokenId?: number;
  dueDate?: string;
  createdAt: string;
}

export default function Debtor() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [repayAmount, setRepayAmount] = useState<{ [key: number]: string }>({});

  // Read USDC balance
  const { data: usdcBalance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Read USDC allowance
  const { data: usdcAllowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.RWA_VAULT] : undefined,
  });

  // Approve USDC
  const {
    writeContractAsync: approveUSDC,
    isPending: isApprovePending
  } = useWriteContract();

  // Repay invoice
  const {
    writeContractAsync: repayInvoice,
    isPending: isRepayPending
  } = useWriteContract();

  // Fetch financed invoices from backend
  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/invoice/list`);
      // Filter for financed invoices only
      const financedInvoices = (response.data.invoices || []).filter(
        (inv: Invoice) => inv.status === 'financed'
      );
      setInvoices(financedInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleApproveUSDC = async (amount: string) => {
    if (!publicClient) {
      alert('Please connect your wallet');
      return;
    }

    try {
      console.log('💰 Step 1: Approving USDC...');
      const amountWei = parseUnits(amount, 6);

      const hash = await approveUSDC({
        address: CONTRACTS.USDC,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [CONTRACTS.RWA_VAULT, amountWei],
      });

      console.log('Transaction hash:', hash);

      console.log('💰 Step 2: Waiting for confirmation...');
      await publicClient.waitForTransactionReceipt({ hash });

      console.log('💰 Step 3: Refreshing allowance...');
      await refetchAllowance();

      alert(`✅ USDC approved successfully!\n\nYou can now repay the invoice.`);
    } catch (error: any) {
      console.error('❌ Error approving USDC:', error);
      alert(`Failed to approve USDC: ${error.message || error.shortMessage}`);
    }
  };

  const handleRepayInvoice = async (tokenId: number, amount: string) => {
    if (!publicClient || !address) {
      alert('Please connect your wallet');
      return;
    }

    try {
      const amountWei = parseUnits(amount, 6);

      // Check allowance
      if (!usdcAllowance || usdcAllowance < amountWei) {
        alert(`⚠️ Insufficient USDC allowance.\n\nPlease approve USDC first.`);
        return;
      }

      // Find the invoice
      const invoice = invoices.find(inv => inv.tokenId === tokenId);
      if (!invoice) {
        alert('Invoice not found');
        return;
      }

      console.log('💸 Step 1: Submitting repayment transaction...');
      console.log('Token ID:', tokenId, 'Amount:', amount, 'USDC');

      const hash = await repayInvoice({
        address: CONTRACTS.RWA_VAULT,
        abi: RWA_VAULT_ABI,
        functionName: 'repayInvoice',
        args: [BigInt(tokenId), amountWei],
      });

      console.log('Transaction hash:', hash);

      if (!hash) {
        throw new Error('Transaction failed - no hash returned');
      }

      console.log('💸 Step 2: Waiting for blockchain confirmation...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('Receipt status:', receipt.status);

      if (receipt.status !== 'success') {
        throw new Error('Transaction reverted on blockchain');
      }

      console.log('💸 Step 3: Updating backend status to "repaid"...');
      // Update invoice status in backend
      await axios.patch(`${BACKEND_URL}/invoice/${invoice.id}`, {
        status: 'repaid',
      });

      console.log('💸 Step 4: Refreshing invoice list...');
      await fetchInvoices();

      // Clear repay amount
      setRepayAmount(prev => ({ ...prev, [tokenId]: '' }));

      alert(`✅ Invoice repaid successfully!\n\nTransaction: ${hash}\nAmount: ${amount} USDC`);
    } catch (error: any) {
      console.error('❌ Error repaying invoice:', error);

      let errorMessage = 'Failed to repay invoice.\n\n';
      if (error.message?.includes('user rejected')) {
        errorMessage += 'You rejected the transaction.';
      } else if (error.message?.includes('not financed')) {
        errorMessage += '⚠️ This invoice has not been financed yet.';
      } else if (error.message?.includes('fully repaid')) {
        errorMessage += '⚠️ This invoice is already fully repaid.';
      } else if (error.response?.data) {
        errorMessage += `Backend error: ${JSON.stringify(error.response.data)}`;
      } else if (error.shortMessage) {
        errorMessage += `Error: ${error.shortMessage}`;
      } else if (error.message) {
        errorMessage += `Error: ${error.message}`;
      }

      alert(errorMessage);
    }
  };

  const formatAmount = (amount: bigint | undefined) => {
    if (!amount) return '0.00';
    return parseFloat(formatUnits(amount, 6)).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Debtor Portal</h1>
          <p className="text-gray-600 mb-6">
            Please connect your wallet to view and repay invoices.
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Debtor Portal</h1>

      {/* USDC Balance Card */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white mb-8">
        <h3 className="text-lg font-medium mb-2">Your USDC Balance</h3>
        <div className="text-4xl font-bold">${formatAmount(usdcBalance)} USDC</div>
        <div className="text-sm mt-2 opacity-90">
          Allowance for Vault: ${formatAmount(usdcAllowance)} USDC
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-yellow-900 mb-3">📋 How to Repay an Invoice</h3>
        <ol className="text-sm text-yellow-800 space-y-2 list-decimal list-inside">
          <li>Find the invoice you need to repay in the table below</li>
          <li>Enter the repayment amount (can be partial or full)</li>
          <li>Click "Approve USDC" to allow the vault to receive your payment</li>
          <li>Click "Repay" to complete the payment</li>
          <li>Once fully repaid, the invoice status will update to "repaid"</li>
        </ol>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">Financed Invoices to Repay</h2>
          <button
            onClick={fetchInvoices}
            disabled={isLoading}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {invoices.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No invoices to repay</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Invoice ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Token ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount (USDC)</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Due Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Repay Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-sm">{invoice.id}</td>
                    <td className="py-3 px-4 font-mono text-sm">
                      {invoice.tokenId !== undefined ? `#${invoice.tokenId}` : 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-blue-600">
                      ${invoice.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {invoice.dueDate
                        ? new Date(invoice.dueDate).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        value={repayAmount[invoice.tokenId!] || ''}
                        onChange={(e) =>
                          setRepayAmount(prev => ({
                            ...prev,
                            [invoice.tokenId!]: e.target.value
                          }))
                        }
                        placeholder={`Max: ${invoice.amount}`}
                        className="w-32 px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        {invoice.tokenId !== undefined && repayAmount[invoice.tokenId] ? (
                          <>
                            <button
                              onClick={() => handleApproveUSDC(repayAmount[invoice.tokenId!])}
                              disabled={isApprovePending}
                              className="bg-yellow-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-yellow-700 disabled:opacity-50 transition-colors"
                            >
                              {isApprovePending ? 'Approving...' : 'Approve USDC'}
                            </button>
                            <button
                              onClick={() => handleRepayInvoice(invoice.tokenId!, repayAmount[invoice.tokenId!])}
                              disabled={isRepayPending}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              {isRepayPending ? 'Repaying...' : 'Repay'}
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">Enter amount</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
