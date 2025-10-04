import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const recipient = process.env.RECIPIENT;
  const amount = process.env.AMOUNT || "10000"; // Default 10,000 USDC

  if (!recipient) {
    console.error("❌ Error: Please provide RECIPIENT address");
    console.log("\nUsage:");
    console.log("RECIPIENT=0x... AMOUNT=10000 pnpm hardhat run scripts/mintUSDC.ts --network sepolia");
    process.exit(1);
  }

  console.log("💰 Minting USDC...\n");

  // Load deployment addresses
  const deploymentFile = path.join(__dirname, "../deployments/latest.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));

  const usdcAddress = deployment.contracts.MockUSDC;

  const [deployer] = await ethers.getSigners();
  console.log("👤 Minting from account:", deployer.address);
  console.log("🎯 Recipient:          ", recipient);
  console.log("💵 Amount:             ", amount, "USDC");

  // Get contract instance
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = MockUSDC.attach(usdcAddress);

  // Check current balance
  const currentBalance = await usdc.balanceOf(recipient);
  console.log("\n📊 Current Balance:    ", ethers.formatUnits(currentBalance, 6), "USDC");

  // Mint USDC
  console.log("\n⏳ Minting USDC...");
  const amountWei = ethers.parseUnits(amount, 6);
  const tx = await usdc.mint(recipient, amountWei);
  await tx.wait();

  console.log("✅ Minted", amount, "USDC");
  console.log("🔗 Transaction hash:", tx.hash);

  // Check new balance
  const newBalance = await usdc.balanceOf(recipient);
  console.log("\n📊 New Balance:        ", ethers.formatUnits(newBalance, 6), "USDC");

  console.log("\n✨ USDC minted successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
