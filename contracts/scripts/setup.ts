import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🔧 Setting up RWA Platform...\n");

  // Load deployment addresses
  const deploymentFile = path.join(__dirname, "../deployments/latest.json");
  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ Error: No deployment found. Run deploy.ts first.");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const { RwaVault: vaultAddress, InvoiceNFT: invoiceAddress } = deployment.contracts;

  const [deployer] = await ethers.getSigners();
  console.log("👤 Setup account:", deployer.address);

  // Get contract instances
  const RwaVault = await ethers.getContractFactory("RwaVault");
  const vault = RwaVault.attach(vaultAddress);

  const InvoiceNFT = await ethers.getContractFactory("InvoiceNFT");
  const invoiceNFT = InvoiceNFT.attach(invoiceAddress);

  // 1. Set InvoiceNFT address in RwaVault
  console.log("\n1️⃣  Configuring RwaVault...");
  const currentInvoiceNFT = await vault.invoiceNFT();
  if (currentInvoiceNFT === ethers.ZeroAddress) {
    console.log("⏳ Setting InvoiceNFT address in RwaVault...");
    const tx = await vault.setInvoiceNFT(invoiceAddress);
    await tx.wait();
    console.log("✅ InvoiceNFT address set in vault");
  } else {
    console.log("✅ InvoiceNFT already configured");
  }

  // 2. Grant ADMIN_ROLE to specified address (or deployer)
  const adminAddress = process.env.ADMIN_ADDRESS || deployer.address;
  console.log("\n2️⃣  Configuring admin permissions...");
  console.log("👤 Admin address:", adminAddress);

  const ADMIN_ROLE = await invoiceNFT.DEFAULT_ADMIN_ROLE();
  const hasRole = await invoiceNFT.hasRole(ADMIN_ROLE, adminAddress);

  if (!hasRole) {
    console.log("⏳ Granting ADMIN_ROLE...");
    const tx = await invoiceNFT.grantRole(ADMIN_ROLE, adminAddress);
    await tx.wait();
    console.log("✅ ADMIN_ROLE granted");
  } else {
    console.log("✅ Address already has ADMIN_ROLE");
  }

  console.log("\n📝 Setup Summary");
  console.log("═".repeat(60));
  console.log("RwaVault:              ", vaultAddress);
  console.log("InvoiceNFT:            ", invoiceAddress);
  console.log("Admin Address:         ", adminAddress);
  console.log("═".repeat(60));

  console.log("\n✨ Setup complete!");
  console.log("\n🎯 Next Steps:");
  console.log("1. Connect wallet with address:", adminAddress);
  console.log("2. You can now mint invoices from the admin panel");
  console.log("3. You can finance invoices from the admin panel\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
