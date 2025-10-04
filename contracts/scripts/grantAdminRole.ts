import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const adminAddress = process.env.ADMIN_ADDRESS;

  if (!adminAddress) {
    console.error("❌ Error: Please provide ADMIN_ADDRESS environment variable");
    console.log("\nUsage:");
    console.log("ADMIN_ADDRESS=0x... pnpm hardhat run scripts/grantAdminRole.ts --network sepolia");
    process.exit(1);
  }

  console.log("🔐 Granting ADMIN_ROLE to:", adminAddress);

  // Load deployment addresses
  const deploymentFile = path.join(__dirname, "../deployments/latest.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));

  const invoiceNFTAddress = deployment.contracts.InvoiceNFT;
  console.log("📄 InvoiceNFT contract:", invoiceNFTAddress);

  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("👤 Granting from account:", deployer.address);

  // Get contract instance
  const InvoiceNFT = await ethers.getContractFactory("InvoiceNFT");
  const invoiceNFT = InvoiceNFT.attach(invoiceNFTAddress);

  // Grant ADMIN_ROLE
  const ADMIN_ROLE = await invoiceNFT.DEFAULT_ADMIN_ROLE();

  // Check if already has role
  const hasRole = await invoiceNFT.hasRole(ADMIN_ROLE, adminAddress);
  if (hasRole) {
    console.log("✅ Address already has ADMIN_ROLE");
    return;
  }

  console.log("⏳ Granting ADMIN_ROLE...");
  const tx = await invoiceNFT.grantRole(ADMIN_ROLE, adminAddress);
  await tx.wait();

  console.log("✅ ADMIN_ROLE granted successfully!");
  console.log("🔗 Transaction hash:", tx.hash);
  console.log("\n✨ You can now mint invoices with this address!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
