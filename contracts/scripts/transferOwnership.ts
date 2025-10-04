import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const newOwner = process.env.NEW_OWNER;

  if (!newOwner) {
    console.error("❌ Error: Please provide NEW_OWNER environment variable");
    console.log("\nUsage:");
    console.log("NEW_OWNER=0x... pnpm hardhat run scripts/transferOwnership.ts --network sepolia");
    process.exit(1);
  }

  console.log("🔐 Transferring RWA Vault ownership...\n");

  // Load deployment addresses
  const deploymentFile = path.join(__dirname, "../deployments/latest.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));

  const vaultAddress = deployment.contracts.RwaVault;

  const [deployer] = await ethers.getSigners();
  console.log("👤 Current owner:", deployer.address);
  console.log("🎯 New owner:    ", newOwner);
  console.log("🏦 Vault:        ", vaultAddress);

  // Get contract instance
  const RwaVault = await ethers.getContractFactory("RwaVault");
  const vault = RwaVault.attach(vaultAddress);

  // Check current owner
  const currentOwner = await vault.owner();
  console.log("\n📋 Verified current owner:", currentOwner);

  if (currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error("❌ Error: You are not the current owner");
    process.exit(1);
  }

  // Transfer ownership
  console.log("\n⏳ Transferring ownership...");
  const tx = await vault.transferOwnership(newOwner);
  await tx.wait();

  console.log("✅ Ownership transferred!");
  console.log("🔗 Transaction hash:", tx.hash);

  // Verify new owner
  const verifiedNewOwner = await vault.owner();
  console.log("\n📋 Verified new owner:", verifiedNewOwner);

  console.log("\n✨ Ownership transfer complete!");
  console.log("\n🎯 Next Steps:");
  console.log("1. Connect with wallet:", newOwner);
  console.log("2. You can now finance invoices from the admin panel");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
