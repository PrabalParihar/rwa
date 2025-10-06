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
      const amountWei = parseUnits(amount, 6);

      const hash = await approveUSDC({
        address: CONTRACTS.USDC,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [CONTRACTS.RWA_VAULT, amountWei],
      });

      if (!hash) {
        alert('Transaction failed');
        return;
      }

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status !== 'success') {
        alert('Transaction failed');
        return;
      }

      // wait for state to update
      setTimeout(async () => {
        await refetchAllowance();
        setTimeout(() => refetchAllowance(), 500);
      }, 1000);

      alert('USDC approved! You can now repay.');
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.shortMessage || error.message || 'Failed to approve');
    }
  };

  const handleRepayInvoice = async (tokenId: number, amount: string) => {
    if (!publicClient || !address) {
      alert('Please connect your wallet');
      return;
    }

    try {
      const amountWei = parseUnits(amount, 6);

      // check allowance
      const { data: currentAllowance } = await refetchAllowance();

      if (!currentAllowance || currentAllowance < amountWei) {
        alert(`Insufficient allowance. Please approve USDC first.`);
        return;
      }

      const invoice = invoices.find(inv => inv.tokenId === tokenId);
      if (!invoice) {
        alert('Invoice not found');
        return;
      }

      const hash = await repayInvoice({
        address: CONTRACTS.RWA_VAULT,
        abi: RWA_VAULT_ABI,
        functionName: 'repayInvoice',
        args: [BigInt(tokenId), amountWei],
      });

      if (!hash) {
        alert('Transaction failed');
        return;
      }

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status !== 'success') {
        alert('Transaction failed');
        return;
      }

      // update backend
      await axios.patch(`${BACKEND_URL}/invoice/${invoice.id}`, {
        status: 'repaid',
      });

      await fetchInvoices();
      setRepayAmount(prev => ({ ...prev, [tokenId]: '' }));

      alert(`Invoice repaid successfully!`);
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.shortMessage || error.message || 'Failed to repay invoice');
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
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Debtor Portal</h1>

      <div className="bg-blue-500 rounded-lg shadow p-6 text-white mb-6">
        <h3 className="text-lg font-semibold mb-2">Your USDC Balance</h3>
        <div className="text-4xl font-bold">${formatAmount(usdcBalance)}</div>
        <div className="text-sm mt-2 opacity-90">
          Vault Allowance: ${formatAmount(usdcAllowance)}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">To repay:</span> Enter amount → Click Approve → Click Repay
        </p>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Invoices to Repay</h2>
          <button
            onClick={fetchInvoices}
            disabled={isLoading}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {invoices.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No invoices to repay</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Invoice ID</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Token ID</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount (USDC)</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Due Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Repay Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-mono">{invoice.id}</td>
                    <td className="py-3 px-4 text-sm">
                      {invoice.tokenId !== undefined ? `#${invoice.tokenId}` : 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-blue-600">
                      ${invoice.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
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
                        className="w-32 px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </td>
                    <td className="py-3 px-4">
                      {invoice.tokenId !== undefined && repayAmount[invoice.tokenId] ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveUSDC(repayAmount[invoice.tokenId!])}
                            disabled={isApprovePending}
                            className="bg-yellow-500 text-white px-3 py-1.5 rounded text-sm hover:bg-yellow-600 disabled:opacity-50"
                          >
                            {isApprovePending ? 'Approving...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleRepayInvoice(invoice.tokenId!, repayAmount[invoice.tokenId!])}
                            disabled={isRepayPending}
                            className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                          >
                            {isRepayPending ? 'Repaying...' : 'Repay'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Enter amount first</span>
                      )}
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
