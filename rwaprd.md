Product Requirements Document (PRD)

Project: Simplified RWA Platform
Audience: Developers + AI Coding Agents
Version: Final Draft
Date: September 30, 2025

⸻

1. Introduction

We are building a Simplified Real-World Asset (RWA) Platform where:
	•	Investors deposit USDC into a vault.
	•	They receive Senior or Junior tranche tokens (ERC-20).
	•	Returns are distributed via a waterfall mechanism (Senior first, then Junior).
	•	Invoices are represented as ERC-721 NFTs (InvoiceNFT).
	•	The system is intentionally lightweight: no on-chain KYC, no complex default handling.

This is an MVP with a smart contract backend (Solidity), a supporting backend (Node.js + MongoDB), and a frontend (React/Next.js).

⸻

2. Personas & User Stories

Persona 1: Alex (DeFi Investor)
	•	As Alex, I want to connect my crypto wallet so I can invest.
	•	As Alex, I want to deposit USDC into Senior or Junior tranches.
	•	As Alex, I want to view my positions and claimable amounts.
	•	As Alex, I want to complete a simple simulated KYC check.

Persona 2: Chris (Platform Admin)
	•	As Chris, I want to mint Invoice NFTs with face value, due date, and debtor hash.
	•	As Chris, I want to track invoices in the backend database.

⸻

3. System Architecture
	•	Smart Contracts (Solidity): Handle deposits, tranche issuance, invoice NFTs, and waterfall distribution.
	•	Backend (Node.js + MongoDB): Store user + invoice data, simulate KYC, serve REST APIs.
	•	Frontend (React/Next.js): UI for investors to connect wallets, invest, and view portfolio.

⸻

4. Functional Requirements

4.1 Smart Contracts

4.1.1 InvoiceNFT (ERC-721)
	•	Purpose: Represent invoices as NFTs.
	•	Requirements:
	•	Mintable only by admin role.
	•	Each NFT stores:
	•	uint256 faceValue → Invoice amount in USDC.
	•	uint256 dueDate → Invoice maturity timestamp.
	•	bytes32 debtorHash → Hashed debtor identifier.
	•	No secondary trading.
	•	Functions:
	•	mintInvoice(address to, uint256 faceValue, uint256 dueDate, bytes32 debtorHash)

4.1.2 RwaVault (ERC-4626-like)
	•	Purpose: Accept deposits, issue tranche tokens, manage waterfall distribution.
	•	Tranches:
	•	SeniorTrancheToken (ERC-20).
	•	JuniorTrancheToken (ERC-20).
	•	Requirements:
	•	Accept USDC deposits only.
	•	Deduct 2% origination fee on deposits.
	•	Distribute returns using waterfall logic:
	1.	Senior tranche holders paid first (principal + yield).
	2.	Junior tranche holders get remainder.
	•	Functions:
	•	deposit(uint256 amount, bool isSenior)
	•	distributeReturns(uint256 totalYield)
	•	calculateFee(uint256 amount) → uint256

⸻

4.2 Backend (Node.js + MongoDB)

4.2.1 Database Models
	•	Users: { wallet: String, kycStatus: String }
	•	Invoices: { id: String, amount: Number, status: String }

4.2.2 REST APIs
	•	POST /kyc/request → Simulated KYC approval.
	•	Input: { wallet }
	•	Output: { wallet, kycStatus: "approved" }
	•	GET /config → Return fee configuration.
	•	Output: { fee: 0.02 }

⸻

4.3 Frontend (React / Next.js)

Pages
	1.	Dashboard: Show vault TVL and overall deposits.
	2.	Invest Page: Wallet connect, select Senior/Junior tranche, deposit USDC.
	3.	Portfolio Page: Show user positions, tranche balances, and claimable amounts.

Wallet Integration
	•	Use Wagmi/Ethers.js or RainbowKit for MetaMask/WalletConnect.

⸻

5. Delivery Requirements
	•	Repo Structure:

/contracts
/backend
/frontend
README.md


	•	README must include:
	•	Installation steps for contracts, backend, frontend.
	•	How to run Hardhat/Foundry tests.
	•	API usage examples.
	•	Frontend run instructions.

⸻

6. Out of Scope
	•	On-chain KYC.
	•	Complex default resolution.
	•	Invoice NFT secondary trading.
	•	Governance/DAO.

⸻

7. Success Criteria
	•	Investors can deposit USDC and receive tranche tokens.
	•	Invoices can be minted with correct metadata.
	•	Waterfall distribution functions correctly (Senior > Junior).
	•	2% fee is deducted and visible in transactions.
	•	Backend APIs respond correctly.
	•	Frontend displays deposits, portfolio, and claims accurately.

⸻

⚡ This PRD is designed for coding agents:
	•	Explicit contracts & functions.
	•	Defined API input/output.
	•	Clear folder structure.
	•	No ambiguity in scope.

⸻