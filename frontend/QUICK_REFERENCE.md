# RWA Platform Frontend - Quick Reference

## Quick Commands

```bash
# Installation
npm install

# Development
npm run dev              # Start dev server on http://localhost:3000

# Production
npm run build           # Build for production
npm start               # Start production server

# Linting
npm run lint            # Run ESLint
```

## Environment Variables

Create `.env.local` with:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_RWA_VAULT_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x...
NEXT_PUBLIC_SENIOR_TRANCHE_ADDRESS=0x...
NEXT_PUBLIC_JUNIOR_TRANCHE_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=11155111
```

## Key Files

| File | Purpose |
|------|---------|
| `app/page.tsx` | Dashboard - Shows TVL and tranche stats |
| `app/invest/page.tsx` | Investment page with KYC and deposits |
| `app/portfolio/page.tsx` | Portfolio management and withdrawals |
| `components/Navigation.tsx` | Nav bar with wallet connect |
| `lib/contracts.ts` | Contract ABIs and addresses |
| `lib/wagmiConfig.ts` | Wagmi/RainbowKit configuration |
| `lib/utils.ts` | Helper functions |
| `types/index.ts` | TypeScript types |

## Contract Interactions

### Reading Contract Data

```typescript
import { useReadContract } from 'wagmi';
import { CONTRACTS, RWA_VAULT_ABI } from '@/lib/contracts';

const { data: tvl } = useReadContract({
  address: CONTRACTS.RWA_VAULT,
  abi: RWA_VAULT_ABI,
  functionName: 'getTotalValueLocked',
});
```

### Writing to Contracts

```typescript
import { useWriteContract } from 'wagmi';
import { CONTRACTS, RWA_VAULT_ABI, Tranche } from '@/lib/contracts';
import { parseUnits } from 'viem';

const { writeContract } = useWriteContract();

const handleDeposit = () => {
  writeContract({
    address: CONTRACTS.RWA_VAULT,
    abi: RWA_VAULT_ABI,
    functionName: 'deposit',
    args: [parseUnits('100', 6), Tranche.SENIOR],
  });
};
```

### Waiting for Transaction

```typescript
import { useWaitForTransactionReceipt } from 'wagmi';

const { data: hash } = useWriteContract();

const { isLoading, isSuccess } = useWaitForTransactionReceipt({
  hash,
});
```

## Common Patterns

### Get Connected Account

```typescript
import { useAccount } from 'wagmi';

const { address, isConnected } = useAccount();
```

### Format USDC Amount

```typescript
import { formatUnits, parseUnits } from 'viem';

// BigInt to display string
const display = formatUnits(amount, 6); // "100.00"

// String to BigInt
const amount = parseUnits("100", 6); // 100000000n
```

### Backend API Call

```typescript
import axios from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

// Check KYC status
const response = await axios.get(`${BACKEND_URL}/kyc/status/${address}`);

// Request KYC
await axios.post(`${BACKEND_URL}/kyc/request`, { address });
```

## Tranche Types

```typescript
// Senior Tranche = 0
// Junior Tranche = 1

import { Tranche } from '@/lib/contracts';

Tranche.SENIOR // 0
Tranche.JUNIOR // 1
```

## Tailwind Classes Reference

### Layout
- `container mx-auto px-4` - Centered container with padding
- `grid grid-cols-1 md:grid-cols-2 gap-6` - Responsive grid
- `flex items-center justify-between` - Flexbox layout

### Colors
- `bg-primary-600` - Primary blue background
- `text-primary-700` - Primary blue text
- `bg-green-500` - Success/Senior green
- `bg-blue-500` - Info/Junior blue

### Spacing
- `p-6` - Padding all sides (1.5rem)
- `mb-4` - Margin bottom (1rem)
- `space-y-4` - Vertical spacing between children

### Buttons
```tsx
<button className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50">
  Button Text
</button>
```

### Cards
```tsx
<div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
  Card Content
</div>
```

## Component Usage

### Navigation (Built-in)
Already in layout, shows on all pages

### Card Component
```tsx
import Card from '@/components/Card';

<Card title="Title" subtitle="Subtitle" borderColor="green">
  Content here
</Card>
```

### Loading Spinner
```tsx
import LoadingSpinner from '@/components/LoadingSpinner';

<LoadingSpinner size="md" />
```

## Debugging Tips

### Check Contract Addresses
```typescript
console.log('Vault:', CONTRACTS.RWA_VAULT);
console.log('USDC:', CONTRACTS.USDC);
```

### Debug Transaction
```typescript
const { data: hash, error } = useWriteContract();

console.log('Transaction hash:', hash);
console.log('Error:', error);
```

### View on Etherscan
```
https://sepolia.etherscan.io/tx/{transaction-hash}
https://sepolia.etherscan.io/address/{contract-address}
```

### Browser Console
- `window.ethereum` - MetaMask provider
- `localStorage` - Check stored data
- Network tab - Check API calls

## Common Issues & Solutions

### Issue: "Wallet not connected"
**Solution:** Use `ConnectButton` from RainbowKit or check `isConnected`

### Issue: "Wrong network"
**Solution:** Prompt user to switch to Sepolia in MetaMask

### Issue: "Transaction failed"
**Solution:** Check:
- User has Sepolia ETH for gas
- USDC allowance is sufficient
- KYC is approved
- Input amounts are valid

### Issue: "Contract read returns undefined"
**Solution:**
- Verify contract addresses in `.env.local`
- Check you're on correct network
- Ensure contracts are deployed

### Issue: "Cannot read property of undefined"
**Solution:** Add optional chaining: `data?.value` instead of `data.value`

## Testing Checklist

- [ ] Connect wallet (MetaMask)
- [ ] Switch to Sepolia network
- [ ] View dashboard data
- [ ] Request KYC approval
- [ ] Approve USDC spending
- [ ] Deposit to Senior tranche
- [ ] Deposit to Junior tranche
- [ ] View portfolio balances
- [ ] Withdraw from tranche
- [ ] Check responsive design
- [ ] Test error scenarios

## Useful Links

- **Next.js Docs**: https://nextjs.org/docs
- **Wagmi Docs**: https://wagmi.sh
- **RainbowKit**: https://rainbowkit.com
- **Tailwind CSS**: https://tailwindcss.com
- **Viem**: https://viem.sh
- **Sepolia Faucet**: https://sepoliafaucet.com
- **MetaMask**: https://metamask.io
- **WalletConnect**: https://cloud.walletconnect.com

## Project Structure at a Glance

```
frontend/
├── app/                    # Pages
│   ├── page.tsx           # Dashboard
│   ├── invest/            # Investment
│   ├── portfolio/         # Portfolio
│   └── layout.tsx         # Layout
├── components/            # Reusable UI
├── lib/                   # Utils & config
├── types/                 # TypeScript types
└── public/               # Static files
```

## Code Style

- Use TypeScript for all files
- Functional components with hooks
- Tailwind for all styling
- Export default for pages/components
- Named exports for utilities
- Async/await for promises
- Try-catch for error handling

## Git Workflow

```bash
git add .
git commit -m "feat: add investment page"
git push origin main
```

## Need Help?

1. Check browser console for errors
2. Review transaction on Etherscan
3. Check backend logs (if API issue)
4. See SETUP.md for detailed guides
5. See README.md for overview
