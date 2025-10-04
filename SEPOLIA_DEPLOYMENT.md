# Deploying RWA Platform to Sepolia Testnet

This guide walks you through deploying the RWA Platform smart contracts to Sepolia testnet.

## Prerequisites

✅ Your wallet already has:
- Private key configured in `.env`
- Alchemy RPC URL configured
- **Sepolia ETH** for gas fees

---

## Step 1: Get Sepolia ETH

You need Sepolia ETH to pay for deployment gas fees. Get free testnet ETH from these faucets:

### Option 1: Alchemy Sepolia Faucet (Recommended)
1. Go to https://sepoliafaucet.com/
2. Sign in with Alchemy account
3. Enter your wallet address: (derive from your private key)
4. Request 0.5 Sepolia ETH

### Option 2: Other Faucets
- https://www.infura.io/faucet/sepolia
- https://sepolia-faucet.pk910.de/
- https://faucet.quicknode.com/ethereum/sepolia

### Check Your Balance

To get your wallet address from the private key:

```bash
cd /Users/prabalpratapsingh/Desktop/rwa/contracts
npx hardhat console --network sepolia
```

In the console:
```javascript
const [deployer] = await ethers.getSigners();
console.log("Your address:", deployer.address);
const balance = await ethers.provider.getBalance(deployer.address);
console.log("Balance:", ethers.formatEther(balance), "ETH");
.exit
```

**You need at least 0.05 ETH to deploy all contracts.**

---

## Step 2: Verify Configuration

Check that your `.env` file exists and has the correct values:

```bash
cd /Users/prabalpratapsingh/Desktop/rwa/contracts
cat .env
```

Should show:
```
PRIVATE_KEY=e736d47829f72409da6cd0eb8e7127cdd8195c455c4e5c39b532de58a59f2647
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/MS9pGRxd1Jh3rhVjyIkFzVfG1g3BcTk3
```

✅ Configuration is ready!

---

## Step 3: Compile Contracts

Make sure contracts are compiled:

```bash
cd /Users/prabalpratapsingh/Desktop/rwa/contracts
pnpm compile
```

**Expected Output:**
```
Compiled 30 Solidity files successfully
```

---

## Step 4: Deploy to Sepolia

Run the deployment script:

```bash
pnpm deploy:sepolia
```

**Expected Output:**
```
🚀 Starting RWA Platform deployment...

📍 Deploying contracts with account: 0x...
💰 Account balance: 0.5 ETH

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

💾 Deployment info saved to: /Users/prabalpratapsingh/Desktop/rwa/contracts/deployments/latest.json

✨ Deployment complete!
```

⏱️ **Deployment takes about 2-3 minutes** on Sepolia.

---

## Step 5: Verify Contract Addresses

The deployment addresses are saved in:
```
/Users/prabalpratapsingh/Desktop/rwa/contracts/deployments/latest.json
```

View them:
```bash
cat /Users/prabalpratapsingh/Desktop/rwa/contracts/deployments/latest.json
```

**📋 SAVE THESE ADDRESSES!** You'll need them for:
1. Frontend configuration
2. Etherscan verification
3. Testing and interaction

---

## Step 6: Verify Contracts on Etherscan (Optional)

Verify your contracts on Sepolia Etherscan for transparency:

### Get Etherscan API Key
1. Go to https://etherscan.io/
2. Sign up / Sign in
3. Go to API Keys → Create new API key
4. Copy the API key

### Add to .env
```bash
echo "ETHERSCAN_API_KEY=YOUR_API_KEY_HERE" >> .env
```

### Update hardhat.config.js

Add this after the `module.exports = {` line:

```javascript
etherscan: {
  apiKey: process.env.ETHERSCAN_API_KEY,
},
```

### Verify Each Contract

```bash
# Verify MockUSDC
npx hardhat verify --network sepolia USDC_ADDRESS

# Verify SeniorTrancheToken
npx hardhat verify --network sepolia SENIOR_ADDRESS

# Verify JuniorTrancheToken
npx hardhat verify --network sepolia JUNIOR_ADDRESS

# Verify RwaVault
npx hardhat verify --network sepolia VAULT_ADDRESS "USDC_ADDRESS" "SENIOR_ADDRESS" "JUNIOR_ADDRESS"

# Verify InvoiceNFT
npx hardhat verify --network sepolia INVOICE_NFT_ADDRESS
```

Replace the addresses with your actual deployed addresses.

---

## Step 7: Configure Frontend for Sepolia

Update `frontend/.env.local` with your Sepolia contract addresses:

```bash
cd /Users/prabalpratapsingh/Desktop/rwa/frontend
nano .env.local
```

Update with your deployed addresses:
```env
NEXT_PUBLIC_VAULT_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x...
NEXT_PUBLIC_SENIOR_ADDRESS=0x...
NEXT_PUBLIC_JUNIOR_ADDRESS=0x...
NEXT_PUBLIC_INVOICE_NFT_ADDRESS=0x...
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

### Update Wagmi Config

Edit `frontend/lib/wagmiConfig.ts` and change the chain from localhost to Sepolia:

```typescript
import { sepolia } from 'wagmi/chains';

// Replace 'localhost' or 'hardhat' with:
chains: [sepolia],
```

---

## Step 8: Test on Sepolia

### 8.1 Mint Test USDC

Open Hardhat console connected to Sepolia:

```bash
cd /Users/prabalpratapsingh/Desktop/rwa/contracts
npx hardhat console --network sepolia
```

In the console:
```javascript
// Get USDC contract
const usdc = await ethers.getContractAt("MockUSDC", "YOUR_USDC_ADDRESS");

// Mint 10,000 USDC to your wallet
const yourAddress = "YOUR_WALLET_ADDRESS";
const tx = await usdc.mint(yourAddress, ethers.parseUnits("10000", 6));
await tx.wait();

console.log("✅ Minted 10,000 USDC");

// Check balance
const balance = await usdc.balanceOf(yourAddress);
console.log("Balance:", ethers.formatUnits(balance, 6), "USDC");

.exit
```

### 8.2 Test Frontend

1. **Start Backend** (in Terminal 1):
   ```bash
   cd /Users/prabalpratapsingh/Desktop/rwa/backend
   pnpm dev
   ```

2. **Start Frontend** (in Terminal 2):
   ```bash
   cd /Users/prabalpratapsingh/Desktop/rwa/frontend
   npm run dev
   ```

3. **Open Browser**:
   - Go to http://localhost:3000
   - Connect MetaMask
   - **Switch to Sepolia network** in MetaMask
   - Complete the deposit flow

### 8.3 View on Etherscan

After making transactions, view them on Sepolia Etherscan:
- https://sepolia.etherscan.io/address/YOUR_VAULT_ADDRESS
- https://sepolia.etherscan.io/address/YOUR_USDC_ADDRESS

---

## Deployment Costs (Estimated)

| Contract | Gas Used | Est. Cost (@ 20 gwei) |
|----------|----------|----------------------|
| MockUSDC | ~600k | ~0.012 ETH |
| SeniorTrancheToken | ~800k | ~0.016 ETH |
| JuniorTrancheToken | ~800k | ~0.016 ETH |
| RwaVault | ~900k | ~0.018 ETH |
| InvoiceNFT | ~1.4M | ~0.028 ETH |
| Configuration txs | ~200k | ~0.004 ETH |
| **TOTAL** | ~4.7M | **~0.094 ETH** |

**Actual costs vary based on gas prices at deployment time.**

---

## Troubleshooting

### "Insufficient funds for gas"
- Get more Sepolia ETH from faucets
- Check balance with `ethers.provider.getBalance()`

### "Nonce too high" Error
- Reset MetaMask account: Settings → Advanced → Clear activity tab data
- Or wait a few minutes and try again

### "Network error" or Timeout
- Check Alchemy RPC URL is correct
- Verify you have API credits on Alchemy
- Try again (Sepolia can be slow sometimes)

### Deployment Hangs
- Check Alchemy dashboard for rate limits
- Wait for network congestion to clear
- Use a different RPC provider

### Contract Verification Fails
- Make sure constructor arguments match deployment
- Check Etherscan API key is valid
- Try manual verification on Etherscan UI

---

## Contract Addresses (Update After Deployment)

After deploying, update these for your reference:

```
Network: Sepolia (Chain ID: 11155111)
Deployer: 0x...

Contracts:
- MockUSDC:             0x...
- SeniorTrancheToken:   0x...
- JuniorTrancheToken:   0x...
- RwaVault:             0x...
- InvoiceNFT:           0x...

Etherscan Links:
- Vault: https://sepolia.etherscan.io/address/0x...
- USDC: https://sepolia.etherscan.io/address/0x...
```

---

## Next Steps After Deployment

1. ✅ Mint test USDC to users
2. ✅ Test deposit flow on frontend
3. ✅ Verify contracts on Etherscan
4. ✅ Test waterfall distribution
5. ✅ Mint Invoice NFTs
6. ✅ Share Sepolia testnet link with testers

---

## Production Deployment (Future)

For mainnet deployment:
1. **Security Audit** - Get professional audit (OpenZeppelin, ConsenSys Diligence)
2. **Use Real USDC** - Replace MockUSDC with actual USDC address
3. **Multi-sig Wallet** - Use Gnosis Safe for admin functions
4. **Pause Mechanism** - Add emergency pause functionality
5. **Rate Limiting** - Implement deposit/withdrawal limits
6. **Insurance** - Consider protocol insurance
7. **Gas Optimization** - Optimize contract code for mainnet gas costs

---

## Support

If you encounter issues:
1. Check the main README: `/Users/prabalpratapsingh/Desktop/rwa/README.md`
2. Review TESTING_GUIDE.md for local testing first
3. Check Hardhat errors in detail
4. Verify all environment variables

---

## Success Checklist

After successful deployment to Sepolia:

- ✅ All 5 contracts deployed
- ✅ Tranche tokens configured with vault address
- ✅ Deployment addresses saved to `latest.json`
- ✅ Frontend `.env.local` updated with addresses
- ✅ Test USDC minted
- ✅ Successful test deposit from frontend
- ✅ Contracts verified on Etherscan (optional)
- ✅ Transactions visible on Sepolia Etherscan

🎉 **Congratulations! Your RWA Platform is live on Sepolia testnet!**

---

**Deployment Command:**
```bash
cd /Users/prabalpratapsingh/Desktop/rwa/contracts
pnpm deploy:sepolia
```
