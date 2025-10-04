# Sepolia Deployment Checklist

## Pre-Deployment ✅

- [x] Hardhat configured for Sepolia
- [x] `.env` file created with private key and RPC URL
- [x] Deployment script ready
- [ ] Deployer wallet has Sepolia ETH (≥ 0.05 ETH)

## Deployment Steps

### 1. Check Balance
```bash
pnpm check-balance
```

### 2. Deploy Contracts
```bash
pnpm deploy:sepolia
```

### 3. Save Addresses
Deployment addresses are automatically saved to:
`deployments/latest.json`

## Post-Deployment

- [ ] Copy all 5 contract addresses
- [ ] Update `frontend/.env.local` with addresses
- [ ] Update `frontend/lib/wagmiConfig.ts` to use Sepolia
- [ ] Mint test USDC to your wallet
- [ ] Test deposit flow on frontend
- [ ] (Optional) Verify contracts on Etherscan

## Contract Addresses (Fill After Deployment)

```
Network: Sepolia (Chain ID: 11155111)
Deployed: [DATE/TIME]

MockUSDC:             0x
SeniorTrancheToken:   0x
JuniorTrancheToken:   0x
RwaVault:             0x
InvoiceNFT:           0x

Deployer Address:     0x
Gas Used:             ETH
```

## Etherscan Links (Fill After Deployment)

```
Vault:   https://sepolia.etherscan.io/address/0x
USDC:    https://sepolia.etherscan.io/address/0x
Senior:  https://sepolia.etherscan.io/address/0x
Junior:  https://sepolia.etherscan.io/address/0x
Invoice: https://sepolia.etherscan.io/address/0x
```

## Quick Deploy Command

```bash
cd /Users/prabalpratapsingh/Desktop/rwa/contracts && pnpm deploy:sepolia
```
