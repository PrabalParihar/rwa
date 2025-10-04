import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const amount = process.env.AMOUNT || "10000"; // Default 10,000 USDC

  console.log("💰 Funding RWA Vault with USDC...\n");

  // Load deployment addresses
  const deploymentFile = path.join(__dirname, "../deployments/latest.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));

  const { MockUSDC: usdcAddress, RwaVault: vaultAddress } = deployment.contracts;

  const [deployer] = await ethers.getSigners();
  console.log("👤 Funding from account:", deployer.address);

  // Get contract instances
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = MockUSDC.attach(usdcAddress);

  // Check current balances
  const deployerBalance = await usdc.balanceOf(deployer.address);
  const vaultBalance = await usdc.balanceOf(vaultAddress);

  console.log("\n📊 Current Balances:");
  console.log("Deployer USDC:", ethers.formatUnits(deployerBalance, 6));
  console.log("Vault USDC:   ", ethers.formatUnits(vaultBalance, 6));

  // Mint USDC to deployer if needed
  const amountWei = ethers.parseUnits(amount, 6);
  if (deployerBalance < amountWei) {
    console.log("\n⏳ Minting USDC to deployer...");
    const mintTx = await usdc.mint(deployer.address, amountWei);
    await mintTx.wait();
    console.log("✅ Minted", amount, "USDC to deployer");
  }

  // Transfer USDC to vault
  console.log("\n⏳ Transferring", amount, "USDC to vault...");
  const transferTx = await usdc.transfer(vaultAddress, amountWei);
  await transferTx.wait();
  console.log("✅ Transferred", amount, "USDC to vault");

  // Check new balances
  const newVaultBalance = await usdc.balanceOf(vaultAddress);
  console.log("\n📊 New Vault Balance:");
  console.log("Vault USDC:", ethers.formatUnits(newVaultBalance, 6));

  console.log("\n✨ Vault funded successfully!");
  console.log("\n🎯 You can now finance invoices from the admin panel!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
