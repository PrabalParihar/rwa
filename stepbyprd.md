can follow verbatim to deliver the MVP described in your PRD and the task brief. core scope: USDC vault, senior/junior tranches, 2% origination fee, simple waterfall, invoice ERC-721, minimal KYC sim, dashboard/invest/portfolio UI

⸻

48-Hour Build Plan (D0–D1–D2)

D0 (now, ~1h) – Repo bootstrap

mkdir rwa-platform && cd rwa-platform
git init
pnpm init
pnpm dlx turbo@latest gen        # optional monorepo, else skip
# packages
mkdir contracts backend frontend

Shared tooling
	•	Node 20+, pnpm, Foundry or Hardhat, Typescript everywhere, Prettier + ESLint.

⸻

D1 — Contracts first, then backend

1) Contracts (~6h)

Stack: Solidity ^0.8.24, OpenZeppelin, Foundry (or Hardhat).

Packages

cd contracts
pnpm init -y
pnpm add -D hardhat @nomicfoundation/hardhat-toolbox dotenv
pnpm add @openzeppelin/contracts
npx hardhat init

Contracts to implement
	1.	InvoiceNFT.sol (ERC-721)

	•	mintInvoice(address to, uint256 faceValue, uint256 dueDate, bytes32 debtorHash) onlyRole(DEFAULT_ADMIN_ROLE).
	•	Store immutable data in a struct mapping tokenId => InvoiceMeta {uint256 faceValue; uint256 dueDate; bytes32 debtorHash;}.
	•	Disable transfers beyond mint (optional: override transferFrom to revert, or keep standard but don’t build UI for trading).

	2.	SeniorTrancheToken.sol, JuniorTrancheToken.sol (ERC-20)

	•	Standard ERC-20, mint/burn restricted to vault.

	3.	RwaVault.sol (ERC-4626-like)

	•	State
	•	address usdc
	•	SeniorTrancheToken senior
	•	JuniorTrancheToken junior
	•	uint16 originationFeeBps = 200 (2%)
	•	accounting: totalSeniorShares, totalJuniorShares, assetsUnderManagement.
	•	Functions
	•	deposit(uint256 amount, bool toSenior)
	•	pulls USDC (user must approve), computes fee, mints tranche tokens net of fee.
	•	calculateFee(uint256 amount) returns (uint256)
	•	distributeReturns(uint256 totalYield)
	•	add totalYield to AUM, then waterfall:
	1.	fill senior pro-rata up to due (principal+yield)
	2.	remainder to junior pro-rata.
	•	(Optional) previewDeposit, previewDistribution view helpers.

Tests (Foundry/Hardhat) (~2h)
	•	deposit_works_and_fees_deducted_2pct
	•	mint_tranches_correct_side
	•	waterfall_pays_senior_before_junior
	•	invoice_mint_admin_only_and_metadata_saved

Env for USDC
	•	Use a mock ERC-20 “USDC” in local tests; on testnet, point to official USDC if available, else deploy mock.

Deploy scripts
	•	01_deploy_tokens.ts → deploy Senior/Junior
	•	02_deploy_vault.ts → set tokens’ minter = vault
	•	03_deploy_invoice_nft.ts → grant admin to deployer

⸻

2) Backend (~4h)

Stack: Node.js + Express + MongoDB.

cd ../backend
pnpm init -y
pnpm add express cors mongoose zod
pnpm add -D typescript ts-node-dev @types/node @types/express

Models
	•	User: { wallet: string, kycStatus: 'not_started'|'approved'|'rejected' }
	•	Invoice: { id: string, amount: number, status: 'pending'|'financed'|'repaid'|'defaulted' }

REST APIs
	•	POST /kyc/request { wallet } → sets/returns { wallet, kycStatus:'approved' } (simulate KYC).
	•	GET /config → { fee: 0.02 } (or { feeBps: 200 }).

Notes
	•	No server-side signing.
	•	CORS enabled for local frontend.
	•	.env: MONGO_URL, PORT.

Seed script (optional)
	•	Seed 2–3 invoices for demo.

⸻

D2 — Frontend + wiring + e2e tests

3) Frontend (~6h)

Stack: Next.js + Wagmi + Ethers + Tailwind.

cd ../frontend
pnpm create next-app@latest . --ts --eslint --app
pnpm add wagmi viem ethers @rainbow-me/rainbowkit axios zustand
pnpm add -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

Pages
	1.	/ Dashboard
	•	Show TVL, total deposits (read from vault: assetsUnderManagement) + tranche supplies.
	2.	/invest Invest
	•	Wallet connect (RainbowKit), select Senior/Junior, input USDC amount.
	•	Call backend:/config to fetch fee and show net after 2%.
	•	Flow: approve USDC → vault.deposit(amount, isSenior).
	3.	/portfolio Portfolio
	•	Read user balances of Senior/Junior ERC-20 + computed claimable (from a view helper on vault or simple calculation).
	4.	Admin mini-panel (optional)
	•	mintInvoice(to, faceValue, dueDate, debtorHash) for demo.

State
	•	useAppStore: wallet, kycStatus, config.fee.

KYC UX
	•	If kycStatus !== 'approved' → show “Complete KYC” button → POST /kyc/request.

⸻

4) E2E happy path (~2h)
	1.	Connect wallet → KYC approve
	2.	Approve USDC → Deposit Senior 100 USDC → receive senior shares, see 2% fee reflected
	3.	Vault owner calls distributeReturns(10 USDC) → senior paid first, junior remainder
	4.	Portfolio reflects new claimables/balances

⸻

Acceptance Checklist (copy into README)

Contracts
	•	InvoiceNFT stores faceValue, dueDate, debtorHash; mint admin-only
	•	Vault accepts USDC deposits, mints correct tranche token
	•	2% fee deduction on deposit (unit test)
	•	distributeReturns executes waterfall: senior → junior (unit test)

Backend
	•	POST /kyc/request flips user to approved
	•	GET /config returns {fee:0.02}

Frontend
	•	Dashboard shows TVL + tranche supplies
	•	Invest page: fee preview & net amount
	•	Portfolio: user balances + claimable view
	•	Basic error toasts (insufficient approval, wrong network)

Delivery
	•	Single repo with /contracts /backend /frontend and README (install, run, usage)

⸻

Minimal Specs (for agents to code directly)

Contracts – ABIs (essentials)

// InvoiceNFT.sol
function mintInvoice(address to, uint256 faceValue, uint256 dueDate, bytes32 debtorHash) external;

// RwaVault.sol
function usdc() external view returns (address);
function deposit(uint256 amount, bool toSenior) external;         // requires prior USDC approve
function calculateFee(uint256 amount) external view returns (uint256);
function distributeReturns(uint256 totalYield) external;
function assetsUnderManagement() external view returns (uint256);

// SeniorTrancheToken/JuniorTrancheToken
function mint(address to, uint256 amount) external;   // onlyVault
function burn(address from, uint256 amount) external; // onlyVault

Events

event Deposited(address indexed user, bool indexed senior, uint256 grossAmount, uint256 fee, uint256 netShares);
event ReturnsDistributed(uint256 totalYield, uint256 toSenior, uint256 toJunior);
event InvoiceMinted(uint256 indexed tokenId, uint256 faceValue, uint256 dueDate, bytes32 debtorHash);

Waterfall rule (precise)
	•	Let S = total senior shares, J = total junior shares.
	•	Let Y = totalYield.
	•	Compute senior due for this round: seniorCut = min(Y, targetSeniorYieldForRound); distribute pro-rata by senior shares.
	•	remaining = Y - seniorCut; distribute to junior pro-rata by junior shares.
(For MVP, “targetSeniorYieldForRound” can be a flat % of AUM or a passed-in value; simplest is to send totalYield chunks such that tests demonstrate Senior > Junior priority.)

Backend – API contract

POST /kyc/request
Content-Type: application/json
Body: { "wallet": "0x..." }
200 -> { "wallet": "0x...", "kycStatus": "approved" }

GET /config
200 -> { "fee": 0.02 }

Frontend – Env & wiring
	•	.env.local
	•	NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
	•	NEXT_PUBLIC_VAULT_ADDRESS=0x...
	•	NEXT_PUBLIC_USDC_ADDRESS=0x...
	•	NEXT_PUBLIC_SENIOR_ADDRESS=0x...
	•	NEXT_PUBLIC_JUNIOR_ADDRESS=0x...

Invest flow pseudocode

const fee = await axios.get(`${API}/config`).then(r=>r.data.fee);
const net = amount * (1 - fee);
await usdc.write.approve({ args:[vault, amount] });
await vault.write.deposit({ args:[amount, isSenior] });


⸻

Risk & Contingencies (pre-baked)
	•	Time: if you’re slipping, skip admin UI and call mintInvoice via script.
	•	Math: keep shares = 1:1 to deposited asset for MVP (no complex share price).
	•	Fees: apply only on deposit (per brief), not on redemption.

⸻

Definition of Done (DoD)
	•	All acceptance checks ✅
	•	Unit tests for fee + waterfall pass ✅
	•	Demo script: deposit → distribute → portfolio reflects ✅
	•	README with single-command runs:
	•	pnpm -w dev (concurrently: anvil/hardhat node + backend + frontend)
	•	deploy script prints contract addresses consumed by frontend
