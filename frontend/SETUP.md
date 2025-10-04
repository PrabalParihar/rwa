# RWA Platform Frontend - Setup Guide

## Quick Start

Follow these steps to get the frontend running:

### 1. Install Dependencies

```bash
cd /Users/prabalpratapsingh/Desktop/rwa/frontend
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your values:

```env
# Backend API
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

# Smart Contract Addresses (Replace with your deployed addresses)
NEXT_PUBLIC_RWA_VAULT_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x...
NEXT_PUBLIC_SENIOR_TRANCHE_ADDRESS=0x...
NEXT_PUBLIC_JUNIOR_TRANCHE_ADDRESS=0x...

# Chain Configuration
NEXT_PUBLIC_CHAIN_ID=11155111
```

**To get contract addresses:**

1. After deploying smart contracts, copy the addresses from deployment output
2. For USDC on Sepolia testnet, use: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
3. Senior and Junior tranche addresses are available from the RwaVault contract methods `seniorTranche()` and `juniorTranche()`

### 3. Get WalletConnect Project ID

1. Go to https://cloud.walletconnect.com
2. Create a new project
3. Copy your Project ID
4. Open `lib/wagmiConfig.ts` and replace `YOUR_WALLET_CONNECT_PROJECT_ID` with your actual ID:

```typescript
export const config = getDefaultConfig({
  appName: 'RWA Platform',
  projectId: 'your-actual-project-id-here',
  chains: [sepolia],
  ssr: true,
});
```

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at http://localhost:3000

## Testing the Application

### 1. Connect Wallet

- Click "Connect Wallet" in the navigation bar
- Connect using MetaMask or any supported wallet
- Make sure you're on Sepolia testnet

### 2. Get Test USDC

On Sepolia testnet, you can get test USDC from:
- Aave Faucet: https://staging.aave.com/faucet/
- Or use the USDC contract's mint function (if available)

### 3. Test Dashboard

- Navigate to Dashboard (home page)
- Verify TVL and tranche supplies are displayed
- Data should load from smart contracts

### 4. Test Investment Flow

1. Navigate to "Invest" page
2. Click "Check KYC Status"
3. If not approved, click "Request KYC Approval"
4. Admin needs to approve in backend (use Postman or curl):

```bash
curl -X POST http://localhost:3001/kyc/approve \
  -H "Content-Type: application/json" \
  -d '{"address": "YOUR_WALLET_ADDRESS"}'
```

5. After KYC approval, select a tranche (Senior or Junior)
6. Enter USDC amount
7. Click "Approve USDC" and confirm in wallet
8. Click "Deposit" and confirm in wallet
9. Wait for transaction confirmation

### 5. Test Portfolio

1. Navigate to "Portfolio" page
2. View your tranche balances
3. See claimable amounts
4. Test withdrawal if desired

## Troubleshooting

### Issue: Wallet not connecting

**Solution:**
- Ensure you're on Sepolia testnet in MetaMask
- Check that WalletConnect Project ID is set correctly
- Try refreshing the page

### Issue: Contract reads failing

**Solution:**
- Verify contract addresses in `.env.local` are correct
- Ensure contracts are deployed on Sepolia
- Check that you're connected to the correct network

### Issue: Transactions failing

**Solution:**
- Ensure you have Sepolia ETH for gas fees
- Check that USDC allowance is sufficient
- Verify KYC is approved
- Check contract interaction in block explorer

### Issue: KYC not working

**Solution:**
- Ensure backend is running on port 3001
- Check `NEXT_PUBLIC_BACKEND_URL` in `.env.local`
- Verify backend database is connected
- Check backend logs for errors

## Development Tips

### Hot Reload

Next.js supports hot module replacement. Changes to files will automatically reload in the browser.

### TypeScript

All components are fully typed. Use TypeScript for type safety:

```typescript
import { useReadContract } from 'wagmi';
import { CONTRACTS, RWA_VAULT_ABI } from '@/lib/contracts';

const { data: tvl } = useReadContract({
  address: CONTRACTS.RWA_VAULT,
  abi: RWA_VAULT_ABI,
  functionName: 'getTotalValueLocked',
});
```

### Styling

Use Tailwind CSS utility classes:

```tsx
<div className="bg-white rounded-lg shadow-md p-6">
  <h1 className="text-2xl font-bold text-gray-900">Title</h1>
</div>
```

### Contract Interactions

Use Wagmi hooks for all contract interactions:

- `useReadContract`: Read contract data
- `useWriteContract`: Write to contracts
- `useWaitForTransactionReceipt`: Wait for transaction confirmation
- `useAccount`: Get connected account info

## Production Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Import project to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Deploy to Other Platforms

The app can be deployed to:
- Netlify
- AWS Amplify
- Docker containers
- Any Node.js hosting

## File Structure Reference

```
frontend/
├── app/                       # Next.js App Router pages
│   ├── invest/page.tsx        # Investment page
│   ├── portfolio/page.tsx     # Portfolio page
│   ├── page.tsx               # Dashboard
│   ├── layout.tsx             # Root layout with navigation
│   ├── globals.css            # Global styles
│   └── providers.tsx          # Web3 providers setup
├── components/                # Reusable React components
│   └── Navigation.tsx         # Nav bar with wallet connect
├── lib/                       # Utility libraries
│   ├── contracts.ts           # Contract ABIs and addresses
│   └── wagmiConfig.ts         # Wagmi/RainbowKit config
├── public/                    # Static files
├── .env.local.example         # Environment template
├── .env.local                 # Your local config (gitignored)
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── tailwind.config.ts         # Tailwind config
└── next.config.js             # Next.js config
```

## Next Steps

1. Customize branding and colors in `tailwind.config.ts`
2. Add more pages as needed (e.g., FAQ, About)
3. Implement analytics tracking
4. Add unit tests with Jest and React Testing Library
5. Set up CI/CD pipeline
6. Configure production environment variables

## Support

For issues or questions:
1. Check the console for error messages
2. Review transaction on Sepolia Etherscan
3. Check backend logs for API errors
4. Refer to documentation:
   - Next.js: https://nextjs.org/docs
   - Wagmi: https://wagmi.sh
   - RainbowKit: https://rainbowkit.com

## Security Notes

- Never commit `.env.local` to version control
- Keep private keys secure
- Audit smart contracts before mainnet deployment
- Use environment variables for sensitive data
- Implement rate limiting in production
- Add CAPTCHA for KYC requests in production
