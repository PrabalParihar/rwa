# RWA Platform - Testing Guide

Follow these steps to test the complete RWA Platform locally.

## Prerequisites

Before starting, make sure you have:
- ✅ Node.js 18+ installed
- ✅ pnpm installed (`npm install -g pnpm`)
- ✅ MongoDB installed and running (or MongoDB Atlas account)
- ✅ MetaMask browser extension installed

---

## Step 1: Install All Dependencies

Open a terminal and navigate to the project root:

```bash
cd /Users/prabalpratapsingh/Desktop/rwa
```

Install dependencies for all packages:

```bash
# Install root workspace dependencies
pnpm install

# Verify installations
cd contracts && pnpm install
cd ../backend && pnpm install
cd ../frontend && npm install
cd ..
```

---

## Step 2: Test Smart Contracts

### 2.1 Compile Contracts

```bash
cd /Users/prabalpratapsingh/Desktop/rwa/contracts
pnpm compile
```

**Expected Output:**
```
Compiled 30 Solidity files successfully
```

### 2.2 Run Tests (34 tests should pass)

```bash
pnpm test
```

**Expected Output:**
```
  InvoiceNFT
    ✔ Should set the correct name and symbol
    ✔ Should grant admin role to deployer
    ... (16 tests)

  RwaVault
    ✔ Should set the correct USDC address
    ✔ Should accept senior deposit and deduct 2% fee
    ... (18 tests)

  34 passing (148ms)
```

✅ **If all 34 tests pass, your contracts are working correctly!**

---

## Step 3: Deploy Contracts to Local Network

### 3.1 Start Local Hardhat Node

Open a **NEW terminal window** and run:

```bash
cd /Users/prabalpratapsingh/Desktop/rwa/contracts
pnpm node
```

**Expected Output:**
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
...
```

**⚠️ Keep this terminal running!**

### 3.2 Deploy Contracts

In your **original terminal**, run:

```bash
cd /Users/prabalpratapsingh/Desktop/rwa/contracts
pnpm deploy
```

**Expected Output:**
```
🚀 Starting RWA Platform deployment...

1️⃣  Deploying MockUSDC...
✅ MockUSDC deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3

2️⃣  Deploying SeniorTrancheToken...
✅ SeniorTrancheToken deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

3️⃣  Deploying JuniorTrancheToken...
✅ JuniorTrancheToken deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

4️⃣  Deploying RwaVault...
✅ RwaVault deployed to: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9

5️⃣  Configuring tranche tokens...
✅ Senior token vault set
✅ Junior token vault set

6️⃣  Deploying InvoiceNFT...
✅ InvoiceNFT deployed to: 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9

📝 Deployment Summary
════════════════════════════════════════════════════════════
MockUSDC:               0x5FbDB2315678afecb367f032d93F642f64180aa3
SeniorTrancheToken:     0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
JuniorTrancheToken:     0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
RwaVault:               0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
InvoiceNFT:             0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
════════════════════════════════════════════════════════════

💾 Deployment info saved to: /Users/prabalpratapsingh/Desktop/rwa/contracts/deployments/latest.json
```

**📋 SAVE THESE ADDRESSES!** You'll need them for the frontend configuration.

---

## Step 4: Set Up Backend

### 4.1 Configure Environment

```bash
cd /Users/prabalpratapsingh/Desktop/rwa/backend
cp .env.example .env
```

Edit the `.env` file:

```bash
# If using local MongoDB:
MONGO_URL=mongodb://localhost:27017/rwa-platform
PORT=4000

# OR if using MongoDB Atlas:
# MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/rwa-platform
# PORT=4000
```

### 4.2 Start Backend Server

In a **NEW terminal window**:

```bash
cd /Users/prabalpratapsingh/Desktop/rwa/backend
pnpm dev
```

**Expected Output:**
```
🚀 RWA Backend starting...
✅ Connected to MongoDB
🌐 Server running on http://localhost:4000
```

**⚠️ Keep this terminal running!**

### 4.3 Test Backend Endpoints

In a **NEW terminal**, test the endpoints:

```bash
# Test config endpoint
curl http://localhost:4000/config

# Expected: {"fee":0.02}

# Test KYC endpoint
curl -X POST http://localhost:4000/kyc/request \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0x1234567890123456789012345678901234567890"}'

# Expected: {"wallet":"0x1234567890123456789012345678901234567890","kycStatus":"approved"}

# Test health endpoint
curl http://localhost:4000/health

# Expected: {"status":"ok"}
```

✅ **If all endpoints respond correctly, your backend is working!**

---

## Step 5: Set Up Frontend

### 5.1 Configure Environment Variables

```bash
cd /Users/prabalpratapsingh/Desktop/rwa/frontend
cp .env.local.example .env.local
```

Edit `.env.local` with the contract addresses from Step 3.2:

```env
NEXT_PUBLIC_VAULT_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
NEXT_PUBLIC_USDC_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_SENIOR_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
NEXT_PUBLIC_JUNIOR_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
NEXT_PUBLIC_INVOICE_NFT_ADDRESS=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

### 5.2 Get WalletConnect Project ID

1. Go to https://cloud.walletconnect.com
2. Sign up / Sign in
3. Create a new project
4. Copy your Project ID

Edit `frontend/lib/wagmiConfig.ts` and update the projectId:

```typescript
projectId: 'YOUR_PROJECT_ID_HERE'
```

### 5.3 Start Frontend

In a **NEW terminal window**:

```bash
cd /Users/prabalpratapsingh/Desktop/rwa/frontend
npm run dev
```

**Expected Output:**
```
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  - Network:      http://192.168.x.x:3000

 ✓ Ready in 2.5s
```

---

## Step 6: Configure MetaMask for Local Network

1. Open MetaMask
2. Click network dropdown → "Add Network" → "Add a network manually"
3. Enter these details:
   - **Network Name:** Hardhat Local
   - **RPC URL:** http://127.0.0.1:8545
   - **Chain ID:** 31337
   - **Currency Symbol:** ETH
4. Save

5. Import a test account:
   - Click account icon → "Import Account"
   - Copy private key from Hardhat node output (Account #0)
   - Default: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

---

## Step 7: End-to-End Testing

### 7.1 Mint Test USDC

Open Hardhat console:

```bash
cd /Users/prabalpratapsingh/Desktop/rwa/contracts
npx hardhat console --network localhost
```

In the console:

```javascript
// Get USDC contract
const usdc = await ethers.getContractAt("MockUSDC", "0x5FbDB2315678afecb367f032d93F642f64180aa3");

// Mint 10,000 USDC to your MetaMask account
const yourAddress = "YOUR_METAMASK_ADDRESS_HERE"; // e.g., 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
await usdc.mint(yourAddress, ethers.parseUnits("10000", 6));

// Check balance
const balance = await usdc.balanceOf(yourAddress);
console.log("USDC Balance:", ethers.formatUnits(balance, 6));
// Should show: 10000.0

// Exit console
.exit
```

### 7.2 Test Frontend Flow

1. **Open Frontend**
   - Navigate to http://localhost:3000

2. **Dashboard Page**
   - Should show TVL: 0 USDC
   - Senior Tranche: 0 tokens
   - Junior Tranche: 0 tokens

3. **Connect Wallet**
   - Click "Connect Wallet"
   - Select MetaMask
   - Approve connection
   - Switch to Hardhat Local network if prompted

4. **Navigate to Invest Page**
   - Click "Invest" in navigation

5. **Complete KYC**
   - Click "Complete KYC"
   - Should show "KYC Status: Approved"

6. **Make a Senior Tranche Deposit**
   - Select "Senior Tranche"
   - Enter amount: 1000
   - Should show:
     - Gross: 1000 USDC
     - Fee (2%): 20 USDC
     - Net: 980 USDC
   - Click "Approve USDC"
   - Confirm in MetaMask
   - Wait for transaction
   - Click "Deposit"
   - Confirm in MetaMask
   - Wait for transaction
   - Should show "Deposit successful!"

7. **Check Portfolio**
   - Click "Portfolio" in navigation
   - Should show:
     - Senior Balance: 980 tokens
     - Share of Pool: 100%
     - Total Value: 980 USDC

8. **Check Dashboard**
   - Click "Dashboard"
   - Should show:
     - TVL: 1000 USDC
     - Senior Supply: 980 tokens

### 7.3 Test Junior Tranche Deposit

Repeat steps 6-8 but select "Junior Tranche" with a different amount (e.g., 500 USDC).

### 7.4 Test Waterfall Distribution

In Hardhat console:

```javascript
// Get contracts
const usdc = await ethers.getContractAt("MockUSDC", "0x5FbDB2315678afecb367f032d93F642f64180aa3");
const vault = await ethers.getContractAt("RwaVault", "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9");

// Get signer (deployer)
const [deployer] = await ethers.getSigners();

// Simulate invoice repayment - distribute 100 USDC yield
const yieldAmount = ethers.parseUnits("100", 6);
await usdc.mint(deployer.address, yieldAmount);
await usdc.approve(await vault.getAddress(), yieldAmount);
await vault.distributeReturns(yieldAmount);

console.log("✅ Distributed 100 USDC yield");

.exit
```

Refresh Portfolio page - you should see claimable amounts updated.

---

## Troubleshooting

### Contract Tests Fail
- Make sure you're in the contracts directory
- Run `pnpm install` first
- Check Node.js version (need 18+)

### "Cannot connect to Hardhat node"
- Make sure Hardhat node is still running
- Check if port 8545 is available
- Restart the node: `pnpm node`

### "Transaction Failed" in Frontend
- Check MetaMask is on correct network (Hardhat Local, chainId 31337)
- Ensure you have USDC balance
- Check you've approved USDC before depositing
- Check contract addresses in `.env.local` match deployment

### Backend "Cannot connect to MongoDB"
- Start MongoDB: `mongod` or check Atlas connection
- Verify MONGO_URL in `.env`
- Check port 27017 is available

### Frontend Build Errors
- Run `npm install` again
- Check Node.js version
- Clear `.next` folder: `rm -rf .next`
- Update WalletConnect project ID

---

## Quick Command Reference

### Terminal 1: Hardhat Node
```bash
cd /Users/prabalpratapsingh/Desktop/rwa/contracts
pnpm node
```

### Terminal 2: Backend
```bash
cd /Users/prabalpratapsingh/Desktop/rwa/backend
pnpm dev
```

### Terminal 3: Frontend
```bash
cd /Users/prabalpratapsingh/Desktop/rwa/frontend
npm run dev
```

---

## Expected State After Full Test

- ✅ Hardhat node running on http://127.0.0.1:8545
- ✅ Backend API running on http://localhost:4000
- ✅ Frontend running on http://localhost:3000
- ✅ Contracts deployed and addresses saved
- ✅ MetaMask connected to local network
- ✅ USDC minted to test account
- ✅ Successful deposit to Senior tranche
- ✅ Portfolio showing correct balances
- ✅ Waterfall distribution tested

---

## Success! 🎉

If you've completed all steps successfully, you have a fully functional RWA platform running locally!

**Next Steps:**
- Test more deposits with different amounts
- Test withdrawals
- Mint Invoice NFTs
- Try depositing to both tranches and test distribution priority
- Deploy to testnet (Sepolia) for public testing

---

For more information, see:
- Main README: `/Users/prabalpratapsingh/Desktop/rwa/README.md`
- Project Structure: `/Users/prabalpratapsingh/Desktop/rwa/PROJECT_STRUCTURE.md`
- Frontend Setup: `/Users/prabalpratapsingh/Desktop/rwa/frontend/SETUP.md`
