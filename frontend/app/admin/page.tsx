'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseUnits, keccak256, toBytes, decodeEventLog } from 'viem';
import axios from 'axios';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CONTRACTS, RWA_VAULT_ABI } from '@/lib/contracts';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
const INVOICE_NFT_ADDRESS = (process.env.NEXT_PUBLIC_INVOICE_NFT_ADDRESS || '') as `0x${string}`;

// Minimal InvoiceNFT ABI
const INVOICE_NFT_ABI = [
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'faceValue', type: 'uint256' },
      { name: 'dueDate', type: 'uint256' },
      { name: 'debtorHash', type: 'bytes32' },
    ],
    name: 'mintInvoice',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'faceValue', type: 'uint256' },
      { indexed: false, name: 'dueDate', type: 'uint256' },
      { indexed: false, name: 'debtorHash', type: 'bytes32' },
    ],
    name: 'InvoiceMinted',
    type: 'event',
  },
] as const;

interface Invoice {
  id: string;
  amount: number;
  status: string;
  tokenId?: number;
  createdAt: string;
}

export default function Admin() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [recipientAddress, setRecipientAddress] = useState('');
  const [faceValue, setFaceValue] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [debtorId, setDebtorId] = useState('');

  // Write contract for minting
  const {
    writeContractAsync: mintInvoice,
    data: mintHash,
    isPending: isMintPending
  } = useWriteContract();

  const { isLoading: isMintLoading, isSuccess: isMintSuccess } =
    useWaitForTransactionReceipt({ hash: mintHash });

  // Write contract for financing
  const {
    writeContractAsync: financeInvoice,
    data: financeHash,
    isPending: isFinancePending
  } = useWriteContract();

  const { isLoading: isFinanceLoading, isSuccess: isFinanceSuccess } =
    useWaitForTransactionReceipt({ hash: financeHash });

  // Write contract for setting InvoiceNFT
  const {
    writeContractAsync: setInvoiceNFT,
    isPending: isSetNFTPending
  } = useWriteContract();

  // Fetch invoices from backend
  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/invoice/list`);
      setInvoices(response.data.invoices || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Handle mint invoice
  const handleMintInvoice = async () => {
    if (!recipientAddress || !faceValue || !dueDate || !debtorId) {
      alert('Please fill in all fields');
      return;
    }

    if (!publicClient) {
      alert('Please connect your wallet');
      return;
    }

    try {
      const faceValueBigInt = parseUnits(faceValue, 6);
      const dueDateTimestamp = Math.floor(new Date(dueDate).getTime() / 1000);
      const debtorHash = keccak256(toBytes(debtorId));

      const hash = await mintInvoice({
        address: INVOICE_NFT_ADDRESS,
        abi: INVOICE_NFT_ABI,
        functionName: 'mintInvoice',
        args: [recipientAddress as `0x${string}`, faceValueBigInt, BigInt(dueDateTimestamp), debtorHash],
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

      // get tokenId from event
      let tokenId: number | undefined;
      for (const log of receipt.logs) {
        try {
          const decodedLog = decodeEventLog({
            abi: INVOICE_NFT_ABI,
            data: log.data,
            topics: log.topics,
          });

          if (decodedLog.eventName === 'InvoiceMinted') {
            tokenId = Number(decodedLog.args.tokenId);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // save to backend
      await axios.post(`${BACKEND_URL}/invoice/create`, {
        id: `INV-${Date.now()}`,
        amount: parseFloat(faceValue),
        status: 'pending',
        recipient: recipientAddress,
        dueDate: new Date(dueDate).toISOString(),
        debtorId: debtorId,
        tokenId: tokenId,
      });

      await fetchInvoices();

      setRecipientAddress('');
      setFaceValue('');
      setDueDate('');
      setDebtorId('');

      alert(`Invoice minted! Token ID: ${tokenId}`);
    } catch (error: any) {
      console.error('Error:', error);

      // More detailed error message
      let errorMessage = 'Failed to mint invoice. ';
      if (error.message) {
        errorMessage += `\n\nError: ${error.message}`;
      }
      if (error.response?.data) {
        errorMessage += `\n\nBackend error: ${JSON.stringify(error.response.data)}`;
      }

      alert(errorMessage);
    }
  };

  // Handle set InvoiceNFT
  const handleSetInvoiceNFT = async () => {
    if (!publicClient) {
      alert('Please connect your wallet');
      return;
    }

    try {
      const hash = await setInvoiceNFT({
        address: CONTRACTS.RWA_VAULT,
        abi: [
          {
            inputs: [{ name: '_invoiceNFT', type: 'address' }],
            name: 'setInvoiceNFT',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
          }
        ],
        functionName: 'setInvoiceNFT',
        args: [INVOICE_NFT_ADDRESS],
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

      alert(`InvoiceNFT address set successfully!`);
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.shortMessage || error.message || 'Failed to set InvoiceNFT address');
    }
  };

  // Handle finance invoice
  const handleFinanceInvoice = async (tokenId: number) => {
    if (!tokenId && tokenId !== 0) {
      alert('Invalid token ID');
      return;
    }

    if (!publicClient) {
      alert('Please connect your wallet');
      return;
    }

    try {
      const invoice = invoices.find(inv => inv.tokenId === tokenId);
      if (!invoice) {
        alert('Invoice not found');
        return;
      }

      const hash = await financeInvoice({
        address: CONTRACTS.RWA_VAULT,
        abi: RWA_VAULT_ABI,
        functionName: 'financeInvoice',
        args: [BigInt(tokenId)],
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

      await axios.patch(`${BACKEND_URL}/invoice/${invoice.id}`, {
        status: 'financed',
      });

      await fetchInvoices();

      alert(`Invoice financed! Token ID: ${tokenId}`);
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.shortMessage || error.message || 'Failed to finance invoice');
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-3xl font-bold mb-4">Admin Panel</h1>
          <p className="text-gray-600 mb-6">
            Connect your wallet to access admin functions
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Panel</h1>

      {/* Setup Section */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-3">⚙️ Initial Setup</h2>
        <p className="text-sm text-gray-700 mb-4">
          Before financing invoices, you must set the InvoiceNFT address in the vault. This only needs to be done once.
        </p>
        <button
          onClick={handleSetInvoiceNFT}
          disabled={isSetNFTPending}
          className="bg-orange-600 text-white px-6 py-2.5 rounded hover:bg-orange-700 disabled:opacity-50"
        >
          {isSetNFTPending ? 'Setting...' : 'Set InvoiceNFT Address'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-6">Mint Invoice NFT</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Recipient Address
            </label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Face Value (USDC)
            </label>
            <input
              type="number"
              value={faceValue}
              onChange={(e) => setFaceValue(e.target.value)}
              placeholder="1000"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Debtor ID
            </label>
            <input
              type="text"
              value={debtorId}
              onChange={(e) => setDebtorId(e.target.value)}
              placeholder="Company XYZ"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          onClick={handleMintInvoice}
          disabled={isMintPending || isMintLoading}
          className="w-full bg-blue-600 text-white py-2.5 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isMintPending || isMintLoading ? 'Minting...' : 'Mint Invoice NFT'}
        </button>

        {isMintSuccess && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
            Invoice NFT minted successfully!
          </div>
        )}
      </div>

      {/* Finance Success Notification */}
      {isFinanceSuccess && (
        <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          ✅ Invoice financed successfully! USDC has been transferred to the invoice owner.
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Invoice Tracking</h2>
          <button
            onClick={fetchInvoices}
            disabled={isLoading}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        <div className="mb-5 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
          <p className="text-sm font-semibold text-blue-900 mb-1">Invoice Lifecycle</p>
          <p className="text-xs text-blue-800">
            Pending → Financed → Repaid/Defaulted (status updates automatically from blockchain)
          </p>
        </div>

        {invoices.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No invoices found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Invoice ID</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Token ID</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Amount (USDC)</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Recipient</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Due Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Status</th>
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
                    <td className="py-3 px-4">${invoice.amount.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono text-xs text-gray-600">
                      {(invoice as any).recipient
                        ? `${(invoice as any).recipient.slice(0, 6)}...${(invoice as any).recipient.slice(-4)}`
                        : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {(invoice as any).dueDate
                        ? new Date((invoice as any).dueDate).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          invoice.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : invoice.status === 'financed'
                            ? 'bg-blue-100 text-blue-800'
                            : invoice.status === 'repaid'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                        title={
                          invoice.status === 'pending'
                            ? 'NFT minted, awaiting vault financing'
                            : invoice.status === 'financed'
                            ? 'Financed by vault, awaiting repayment'
                            : invoice.status === 'repaid'
                            ? 'Fully repaid, returns distributed'
                            : 'Past due date without full repayment'
                        }
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {invoice.status === 'pending' && invoice.tokenId !== undefined ? (
                        <button
                          onClick={() => handleFinanceInvoice(invoice.tokenId!)}
                          disabled={isFinancePending || isFinanceLoading}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isFinancePending || isFinanceLoading ? 'Financing...' : 'Finance'}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {invoice.status === 'pending' ? 'No Token ID' : '-'}
                        </span>
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
