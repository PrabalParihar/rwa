# 🚀 Quick Deploy to Sepolia - Start Here!

## ⚡ Fast Track Deployment

Everything is configured and ready. Follow these steps:

---

## Step 1: Check Your Balance (30 seconds)

```bash
cd /Users/prabalpratapsingh/Desktop/rwa/contracts
pnpm check-balance
```

**Expected Output:**
```
📍 Deployer address: 0x...
💰 Sepolia ETH balance: X.XX ETH

✅ Sufficient balance for deployment!
```

### If You Don't Have Enough ETH:

Your deployer address will be shown. Get free Sepolia ETH:

1. **Alchemy Faucet** (Easiest): https://sepoliafaucet.com/
2. **Infura Faucet**: https://www.infura.io/faucet/sepolia
3. **POW Faucet**: https://sepolia-faucet.pk910.de/

Then run `pnpm check-balance` again.

---

## Step 2: Deploy to Sepolia (2-3 minutes)

```bash
pnpm deploy:sepolia
```

**Watch the deployment progress:**
```
🚀 Starting RWA Platform deployment...

1️⃣  Deploying MockUSDC...
✅ MockUSDC deployed to: 0x...

2️⃣  Deploying SeniorTrancheToken...
✅ SeniorTrancheToken deployed to: 0x...

3️⃣  Deploying JuniorTrancheToken...
✅ JuniorTrancheToken deployed to: 0x...

4️⃣  Deploying RwaVault...
✅ RwaVault deployed to: 0x...

5️⃣  Configuring tranche tokens...
✅ Senior token vault set
✅ Junior token vault set

6️⃣  Deploying InvoiceNFT...
✅ InvoiceNFT deployed to: 0x...

📝 Deployment Summary
════════════════════════════════════════════════════════════
MockUSDC:               0x...
SeniorTrancheToken:     0x...
JuniorTrancheToken:     0x...
RwaVault:               0x...
InvoiceNFT:             0x...
════════════════════════════════════════════════════════════

✨ Deployment complete!
```

**📋 Copy and save all 5 contract addresses!**

---

## Step 3: View Your Deployment (30 seconds)

Addresses are automatically saved here:
```bash
cat contracts/deployments/latest.json
```

View on Sepolia Etherscan:
- Replace ADDRESS with your vault address:
  ```
  https://sepolia.etherscan.io/address/ADDRESS
  ```

---

## Step 4: Update Frontend (1 minute)

```bash
cd ../frontend
cp .env.local.example .env.local
nano .env.local
```

Paste your contract addresses:
```env
NEXT_PUBLIC_VAULT_ADDRESS=0xYourVaultAddress
NEXT_PUBLIC_USDC_ADDRESS=0xYourUSDCAddress
NEXT_PUBLIC_SENIOR_ADDRESS=0xYourSeniorAddress
NEXT_PUBLIC_JUNIOR_ADDRESS=0xYourJuniorAddress
NEXT_PUBLIC_INVOICE_NFT_ADDRESS=0xYourInvoiceNFTAddress
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

---

## Step 5: Update Frontend Chain (1 minute)

Edit `frontend/lib/wagmiConfig.ts`:

```bash
nano lib/wagmiConfig.ts
```

Change this line:
```typescript
import { sepolia } from 'wagmi/chains';

// Find the chains array and update:
chains: [sepolia],
```

---

## Step 6: Mint Test USDC (2 minutes)

```bash
cd ../contracts
npx hardhat console --network sepolia
```

In the console, paste (replace YOUR_USDC_ADDRESS and YOUR_WALLET_ADDRESS):
```javascript
const usdc = await ethers.getContractAt("MockUSDC", "YOUR_USDC_ADDRESS");
const tx = await usdc.mint("YOUR_WALLET_ADDRESS", ethers.parseUnits("10000", 6));
await tx.wait();
console.log("✅ Minted 10,000 USDC");
.exit
```

---

## Step 7: Test It! (5 minutes)

### Start Backend (Terminal 1):
```bash
cd ../backend
pnpm dev
```

### Start Frontend (Terminal 2):
```bash
cd ../frontend
npm run dev
```

### Open Browser:
1. Go to http://localhost:3000
2. Connect MetaMask
3. **Switch to Sepolia network**
4. Click "Invest"
5. Complete KYC
6. Deposit USDC!

---

## 📊 Summary of What You Have

✅ **Smart Contracts on Sepolia:**
- MockUSDC (test token)
- Senior Tranche Token
- Junior Tranche Token
- RWA Vault (with 2% fee & waterfall)
- Invoice NFT

✅ **Configuration:**
- `.env` with private key & RPC
- Hardhat configured for Sepolia
- Deployment script ready

✅ **Next Steps:**
- Deploy (2-3 min)
- Update frontend config (1 min)
- Mint test USDC (2 min)
- Test full flow (5 min)

**Total Time: ~10-15 minutes**

---

## 🆘 Quick Troubleshooting

### "Insufficient funds"
→ Get Sepolia ETH from faucets above

### "Network error"
→ Check Alchemy dashboard, RPC URL is working

### Deployment hangs
→ Wait 30 seconds, Sepolia can be slow

### Frontend can't connect
→ Make sure MetaMask is on Sepolia network

---

## 📱 Commands Cheat Sheet

```bash
# Check balance
cd /Users/prabalpratapsingh/Desktop/rwa/contracts
pnpm check-balance

# Deploy to Sepolia
pnpm deploy:sepolia

# View deployment
cat deployments/latest.json

# Start backend
cd ../backend
pnpm dev

# Start frontend
cd ../frontend
npm run dev

# Hardhat console
cd ../contracts
npx hardhat console --network sepolia
```

---

## 🎯 Ready to Deploy?

Run this now:
```bash
cd /Users/prabalpratapsingh/Desktop/rwa/contracts
pnpm check-balance
```

If balance is sufficient, run:
```bash
pnpm deploy:sepolia
```

**That's it! You're deploying to Sepolia! 🚀**

---

For detailed information, see:
- **SEPOLIA_DEPLOYMENT.md** - Full deployment guide
- **TESTING_GUIDE.md** - Testing instructions
- **README.md** - Project overview
