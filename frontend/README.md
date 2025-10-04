# RWA Platform Frontend

A Next.js 14+ frontend application for the Real World Asset (RWA) investment platform with tranche-based investing.

## Features

- **Dashboard**: View vault TVL and tranche supplies
- **Invest**: Deposit USDC into Senior or Junior tranches with KYC verification
- **Portfolio**: View and manage your tranche investments
- **Web3 Integration**: Full wallet connection and smart contract interaction using Wagmi and RainbowKit

## Tech Stack

- **Next.js 14+** with App Router
- **React 18**
- **TypeScript**
- **Tailwind CSS** for styling
- **Wagmi v2** for Ethereum interactions
- **RainbowKit v2** for wallet connection
- **Viem** for Ethereum utilities
- **Axios** for backend API calls

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- A WalletConnect Project ID (get from https://cloud.walletconnect.com)

### Installation

1. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Create `.env.local` file:

```bash
cp .env.local.example .env.local
```

3. Update `.env.local` with your configuration:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_RWA_VAULT_ADDRESS=0x... # Your deployed RwaVault address
NEXT_PUBLIC_USDC_ADDRESS=0x... # USDC address on your network
NEXT_PUBLIC_SENIOR_TRANCHE_ADDRESS=0x... # Senior tranche token address
NEXT_PUBLIC_JUNIOR_TRANCHE_ADDRESS=0x... # Junior tranche token address
NEXT_PUBLIC_CHAIN_ID=11155111 # Sepolia testnet
```

4. Update `lib/wagmiConfig.ts` with your WalletConnect Project ID

### Development

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

Build for production:

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── app/
│   ├── invest/
│   │   └── page.tsx          # Investment page
│   ├── portfolio/
│   │   └── page.tsx          # Portfolio page
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Dashboard (home)
│   └── providers.tsx         # Web3 providers
├── components/
│   └── Navigation.tsx        # Navigation bar
├── lib/
│   ├── contracts.ts          # Contract addresses and ABIs
│   └── wagmiConfig.ts        # Wagmi configuration
├── public/                   # Static assets
├── .env.local.example        # Environment variables template
├── next.config.js            # Next.js configuration
├── package.json              # Dependencies
├── postcss.config.js         # PostCSS configuration
├── tailwind.config.ts        # Tailwind configuration
└── tsconfig.json             # TypeScript configuration
```

## Key Features

### Dashboard Page
- Displays total value locked (TVL) in the vault
- Shows senior and junior tranche total supplies
- Information cards explaining each tranche type

### Invest Page
- Wallet connection requirement
- KYC status verification
- Tranche selection (Senior/Junior)
- USDC amount input with balance display
- Fee preview (2% deposit fee)
- Two-step process: USDC approval + deposit
- Transaction status feedback

### Portfolio Page
- Senior tranche balance and claimable value
- Junior tranche balance and claimable value
- Share of pool percentage
- Withdraw functionality for each tranche
- Total portfolio value display

## Smart Contract Integration

The app integrates with the following contracts:

- **RwaVault**: Main vault contract for deposits and withdrawals
- **USDC**: ERC20 token for deposits
- **Senior Tranche**: ERC20 token representing senior tranche shares
- **Junior Tranche**: ERC20 token representing junior tranche shares

## Error Handling

All contract interactions include proper error handling:
- Transaction pending states
- Loading states during confirmation
- Success/failure feedback
- Input validation

## Responsive Design

The UI is fully responsive and works on:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (< 768px)

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
