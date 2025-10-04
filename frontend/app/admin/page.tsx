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
      console.log('Step 1: Converting inputs...');
      // Convert inputs
      const faceValueBigInt = parseUnits(faceValue, 6); // USDC has 6 decimals
      const dueDateTimestamp = Math.floor(new Date(dueDate).getTime() / 1000);
      const debtorHash = keccak256(toBytes(debtorId));
      console.log('Inputs:', { faceValueBigInt, dueDateTimestamp, debtorHash });

      console.log('Step 2: Minting NFT on blockchain...');
      // Mint NFT on blockchain
      const hash = await mintInvoice({
        address: INVOICE_NFT_ADDRESS,
        abi: INVOICE_NFT_ABI,
        functionName: 'mintInvoice',
        args: [recipientAddress as `0x${string}`, faceValueBigInt, BigInt(dueDateTimestamp), debtorHash],
      });

      console.log('Transaction hash:', hash);

      if (!hash) {
        throw new Error('Transaction failed - no hash returned');
      }

      console.log('Step 3: Waiting for transaction receipt...');
      // Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('Receipt received:', receipt.status);

      if (receipt.status !== 'success') {
        throw new Error('Transaction reverted on blockchain');
      }

      console.log('Step 4: Parsing InvoiceMinted event...');
      // Parse InvoiceMinted event to get tokenId
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
            console.log('TokenId extracted from event:', tokenId);
            break;
          }
        } catch (e) {
          // Skip logs that don't match our ABI
          continue;
        }
      }

      if (tokenId === undefined) {
        console.warn('Could not extract tokenId from event, continuing anyway...');
      }

      console.log('Step 5: Saving to backend database...');
      // Save to backend database with tokenId
      const backendResponse = await axios.post(`${BACKEND_URL}/invoice/create`, {
        id: `INV-${Date.now()}`,
        amount: parseFloat(faceValue),
        status: 'pending',
        recipient: recipientAddress,
        dueDate: new Date(dueDate).toISOString(),
        debtorId: debtorId,
        tokenId: tokenId,
      });

      console.log('Backend response:', backendResponse.data);

      console.log('Step 6: Refreshing invoice list...');
      // Refresh invoice list
      await fetchInvoices();

      // Clear form
      setRecipientAddress('');
      setFaceValue('');
      setDueDate('');
      setDebtorId('');

      alert(`✅ Invoice NFT minted successfully!\n\nTransaction: ${hash}\nToken ID: ${tokenId}`);
    } catch (error: any) {
      console.error('❌ Error minting invoice:', error);

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
      console.log('🏦 Step 1: Financing invoice with Token ID:', tokenId);
      console.log('Vault address:', CONTRACTS.RWA_VAULT);
      console.log('Your wallet:', address);

      // Find the invoice by tokenId
      const invoice = invoices.find(inv => inv.tokenId === tokenId);
      if (!invoice) {
        alert('Invoice not found');
        return;
      }

      console.log('🏦 Step 2: Submitting finance transaction...');
      const hash = await financeInvoice({
        address: CONTRACTS.RWA_VAULT,
        abi: RWA_VAULT_ABI,
        functionName: 'financeInvoice',
        args: [BigInt(tokenId)],
      });

      console.log('Transaction hash:', hash);

      if (!hash) {
        throw new Error('Transaction failed - no hash returned');
      }

      console.log('🏦 Step 3: Waiting for blockchain confirmation...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('Receipt status:', receipt.status);

      if (receipt.status !== 'success') {
        throw new Error('Transaction reverted on blockchain');
      }

      console.log('🏦 Step 4: Updating backend status to "financed"...');
      // Update invoice status in backend
      await axios.patch(`${BACKEND_URL}/invoice/${invoice.id}`, {
        status: 'financed',
      });

      console.log('🏦 Step 5: Refreshing invoice list...');
      // Refresh invoice list
      await fetchInvoices();

      alert(`✅ Invoice financed successfully!\n\nTransaction: ${hash}\nToken ID: ${tokenId}`);
    } catch (error: any) {
      console.error('❌ Error financing invoice:', error);

      let errorMessage = 'Failed to finance invoice.\n\n';

      // Check for common errors
      if (error.message?.includes('user rejected')) {
        errorMessage += 'You rejected the transaction.';
      } else if (error.message?.includes('Ownable')) {
        errorMessage += '⚠️ You are not the vault owner.\n\nOnly the owner can finance invoices.';
      } else if (error.message?.includes('insufficient')) {
        errorMessage += '⚠️ Vault has insufficient USDC balance.\n\nPlease deposit USDC to the vault first.';
      } else if (error.message?.includes('already financed')) {
        errorMessage += '⚠️ This invoice is already financed.';
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

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Admin Panel</h1>
          <p className="text-gray-600 mb-6">
            Please connect your wallet to access the admin panel.
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Admin Panel</h1>

      {/* Mint Invoice NFT Form */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Mint Invoice NFT</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Address
            </label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Face Value (USDC)
            </label>
            <input
              type="number"
              value={faceValue}
              onChange={(e) => setFaceValue(e.target.value)}
              placeholder="1000"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Debtor ID
            </label>
            <input
              type="text"
              value={debtorId}
              onChange={(e) => setDebtorId(e.target.value)}
              placeholder="Company XYZ"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        <button
          onClick={handleMintInvoice}
          disabled={isMintPending || isMintLoading}
          className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

      {/* Invoice List */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">Invoice Tracking</h2>
          <button
            onClick={fetchInvoices}
            disabled={isLoading}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Invoice Lifecycle Info */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Invoice Lifecycle:</h3>
          <div className="text-xs text-blue-800 space-y-1">
            <p><strong>Pending:</strong> Invoice NFT minted, waiting for vault to finance</p>
            <p><strong>Financed:</strong> Vault has funded the invoice (via <code>financeInvoice()</code>)</p>
            <p><strong>Repaid:</strong> Debtor has repaid the invoice (via <code>repayInvoice()</code>)</p>
            <p><strong>Defaulted:</strong> Invoice past due date without full repayment</p>
          </div>
          <p className="text-xs text-blue-700 mt-2 italic">
            Status is automatically updated based on blockchain transactions. Manual editing is not supported.
          </p>
        </div>

        {invoices.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No invoices found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Invoice ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Token ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount (USDC)</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Recipient</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Due Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
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
