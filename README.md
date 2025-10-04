# RWA Platform - Real-World Asset Financing

A decentralized platform for invoice financing using blockchain technology. Investors deposit USDC to receive Senior or Junior tranche tokens, and returns are distributed via a waterfall mechanism.

## 🏗️ Architecture

```
rwa-platform/
├── contracts/          # Solidity smart contracts (Hardhat)
├── backend/           # Node.js + Express + MongoDB API
├── frontend/          # Next.js 14 + Wagmi + RainbowKit
└── README.md         # This file
```

## 🎯 Features

### Smart Contracts
- **InvoiceNFT (ERC-721)**: Represents real-world invoices as NFTs
- **SeniorTrancheToken (ERC-20)**: Senior tranche positions (priority returns)
- **JuniorTrancheToken (ERC-20)**: Junior tranche positions (higher risk/reward)
- **RwaVault**: Manages deposits, 2% origination fee, and waterfall distribution
- **MockUSDC**: Testing token (6 decimals like real USDC)

### Backend API
- **POST /kyc/request**: Simulated KYC approval
- **GET /config**: Returns platform configuration (2% fee)

### Frontend
- **Dashboard**: View TVL and tranche supplies
- **Invest**: Connect wallet, complete KYC, deposit USDC
- **Portfolio**: View positions and claimable amounts

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- MongoDB (local or Atlas)
- MetaMask or compatible Web3 wallet

### 1. Install Dependencies

```bash
# Install all workspace dependencies
pnpm install

# Or install each package separately
pnpm --filter contracts install
pnpm --filter backend install
pnpm --filter frontend install
```

### 2. Smart Contracts

```bash
cd contracts

# Compile contracts
pnpm compile

# Run tests (34 tests should pass)
pnpm test

# Start local Hardhat node (in a separate terminal)
pnpm node

# Deploy contracts to local network
pnpm deploy
```

The deployment script will output contract addresses - **save these for the frontend configuration**.

### 3. Backend

```bash
cd backend

# Create .env file
cp .env.example .env

# Edit .env and add your MongoDB URL
# MONGO_URL=mongodb://localhost:27017/rwa-platform
# PORT=4000

# Start development server
pnpm dev
```

Backend will run on `http://localhost:4000`

### 4. Frontend

```bash
cd frontend

# Create environment file
cp .env.local.example .env.local

# Edit .env.local with contract addresses from step 2
# NEXT_PUBLIC_VAULT_ADDRESS=0x...
# NEXT_PUBLIC_USDC_ADDRESS=0x...
# NEXT_PUBLIC_SENIOR_ADDRESS=0x...
# NEXT_PUBLIC_JUNIOR_ADDRESS=0x...
# NEXT_PUBLIC_BACKEND_URL=http://localhost:4000

# Also get a WalletConnect Project ID from https://cloud.walletconnect.com
# and update it in lib/wagmiConfig.ts

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on `http://localhost:3000`

## 📖 Usage Guide

### For Investors

1. **Connect Wallet**: Click "Connect Wallet" button
2. **Complete KYC**: On the Invest page, complete the simulated KYC check
3. **Get Test USDC**: Use the deployed MockUSDC contract to mint test tokens
4. **Choose Tranche**:
   - **Senior**: Lower risk, priority in waterfall, fixed ~8% APY
   - **Junior**: Higher risk, gets remainder after senior paid, variable returns
5. **Deposit USDC**:
   - Enter amount
   - Approve USDC spending
   - Confirm deposit transaction
   - 2% origination fee is automatically deducted
6. **View Portfolio**: Check your tranche balances and claimable amounts

### For Admins

```bash
# Mint test USDC to users
npx hardhat console --network localhost
> const usdc = await ethers.getContractAt("MockUSDC", "USDC_ADDRESS")
> await usdc.mint("USER_ADDRESS", ethers.parseUnits("10000", 6))

# Mint Invoice NFTs
> const invoiceNFT = await ethers.getContractAt("InvoiceNFT", "INVOICE_ADDRESS")
> const faceValue = ethers.parseUnits("50000", 6)
> const dueDate = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
> const debtorHash = ethers.keccak256(ethers.toUtf8Bytes("Debtor123"))
> await invoiceNFT.mintInvoice("RECIPIENT_ADDRESS", faceValue, dueDate, debtorHash)

# Distribute returns (simulating invoice repayment)
> const vault = await ethers.getContractAt("RwaVault", "VAULT_ADDRESS")
> const yieldAmount = ethers.parseUnits("5000", 6)
> await usdc.approve(vault.address, yieldAmount)
> await vault.distributeReturns(yieldAmount)
```

## 🧪 Testing

### Contract Tests
```bash
cd contracts
pnpm test
```

All tests validate:
- ✅ 2% origination fee calculation
- ✅ Senior/Junior tranche token minting
- ✅ Waterfall distribution (senior paid first)
- ✅ Invoice NFT minting with metadata
- ✅ Transfer restrictions on invoices

### Manual E2E Test Flow
1. Deploy contracts to local Hardhat network
2. Start backend server
3. Start frontend
4. Mint USDC to test wallet
5. Connect wallet on frontend
6. Complete KYC
7. Approve USDC and deposit into Senior tranche
8. Check portfolio shows correct balance
9. Admin distributes returns
10. Portfolio shows claimable amount

## 📝 Contract Addresses (After Deployment)

After running `pnpm deploy` in the contracts directory, update these in `frontend/.env.local`:

```
NEXT_PUBLIC_VAULT_ADDRESS=
NEXT_PUBLIC_USDC_ADDRESS=
NEXT_PUBLIC_SENIOR_ADDRESS=
NEXT_PUBLIC_JUNIOR_ADDRESS=
NEXT_PUBLIC_INVOICE_NFT_ADDRESS=
```

Addresses are saved in `contracts/deployments/latest.json`

## 🔧 Technical Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity 0.8.24, OpenZeppelin, Hardhat |
| Backend | Node.js, Express, MongoDB, Mongoose, TypeScript |
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Web3 | Wagmi v2, Viem, RainbowKit v2 |
| Testing | Hardhat (Chai, Ethers) |

## 📊 System Flow

```
1. Investor deposits USDC → Vault
2. Vault deducts 2% fee
3. Vault mints tranche tokens (1:1 with net deposit)
4. Invoice payments received → Vault
5. Vault distributes via waterfall:
   - Senior tranche paid first (principal + yield)
   - Junior tranche gets remainder
6. Investors can claim/withdraw their returns
```

## 🔐 Security Considerations

**⚠️ This is an MVP for demonstration purposes:**

- No on-chain KYC verification
- Simplified default handling
- No invoice NFT secondary trading
- No governance mechanism
- Mock USDC (not real USDC)

**For production deployment:**
- Implement proper KYC/AML
- Add pause mechanism
- Conduct full security audit
- Add emergency withdrawal
- Implement proper access controls
- Use real USDC on mainnet

## 🏁 Success Criteria (All ✅)

- ✅ Investors can deposit USDC and receive tranche tokens
- ✅ Invoices can be minted with correct metadata (faceValue, dueDate, debtorHash)
- ✅ Waterfall distribution functions correctly (Senior → Junior)
- ✅ 2% fee is deducted and visible in transactions
- ✅ Backend APIs respond correctly
- ✅ Frontend displays deposits, portfolio, and claims accurately
- ✅ All 34 contract tests pass

## 📚 Documentation

- **Contracts**: See `contracts/README.md` (if exists) or contract inline comments
- **Backend**: See `backend/src/` for API route implementations
- **Frontend**: See `frontend/README.md`, `SETUP.md`, and `QUICK_REFERENCE.md`

## 🐛 Troubleshooting

### "Insufficient Funds" Error
- Make sure you've minted test USDC to your wallet
- Check your wallet is connected to the correct network (Localhost/Hardhat)

### Transaction Fails
- Ensure you've approved USDC spending before depositing
- Check contract addresses in `.env.local` are correct
- Verify Hardhat node is still running

### Frontend Not Connecting to Wallet
- Update WalletConnect Project ID in `lib/wagmiConfig.ts`
- Clear browser cache and reconnect wallet
- Check wallet is on correct network (chainId: 31337)

### Backend Connection Errors
- Ensure MongoDB is running
- Check `MONGO_URL` in `backend/.env`
- Verify port 4000 is not in use

## 🤝 Contributing

This is a demonstration project following the PRD specifications. For improvements:
1. Test thoroughly
2. Follow existing code style
3. Add tests for new features
4. Update documentation

## 📄 License

MIT

---

## 🎯 Next Steps for Production

1. **Security Audit**: Conduct comprehensive smart contract audit
2. **Testnet Deployment**: Deploy to Sepolia/Goerli
3. **Real KYC Integration**: Integrate with KYC provider (Persona, Onfido, etc.)
4. **Enhanced Backend**: Add proper authentication, rate limiting, logging
5. **Analytics**: Add transaction history, APY tracking, charts
6. **Mobile Responsive**: Optimize mobile experience
7. **Gas Optimization**: Optimize contract gas usage
8. **Mainnet Prep**: Use real USDC, configure proper network settings

---

Built following the RWA Platform PRD specifications.
