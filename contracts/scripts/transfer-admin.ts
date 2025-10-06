import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🔄 Transferring admin roles...\n");

  const NEW_ADMIN = "0xE5FB6be08698719926C54ccC2BF857Bfe8Af0eD8";

  // Read deployment info
  const deploymentFile = path.join(__dirname, "../deployments/latest.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));

  const [deployer] = await ethers.getSigners();
  console.log("Current admin:", deployer.address);
  console.log("New admin:", NEW_ADMIN);

  // Get contract instances
  const vault = await ethers.getContractAt("RwaVault", deployment.contracts.RwaVault);
  const invoiceNFT = await ethers.getContractAt("InvoiceNFT", deployment.contracts.InvoiceNFT);

  // 1. Transfer RwaVault ownership
  console.log("\n1️⃣  Transferring RwaVault ownership...");
  const currentOwner = await vault.owner();
  console.log("Current owner:", currentOwner);

  let tx = await vault.transferOwnership(NEW_ADMIN);
  await tx.wait();
  console.log("✅ RwaVault ownership transferred");

  const newOwner = await vault.owner();
  console.log("New owner:", newOwner);

  // 2. Grant admin role on InvoiceNFT
  console.log("\n2️⃣  Granting InvoiceNFT admin role...");
  const ADMIN_ROLE = await invoiceNFT.DEFAULT_ADMIN_ROLE();

  tx = await invoiceNFT.grantRole(ADMIN_ROLE, NEW_ADMIN);
  await tx.wait();
  console.log("✅ Admin role granted to new address");

  // Check if new admin has the role
  const hasRole = await invoiceNFT.hasRole(ADMIN_ROLE, NEW_ADMIN);
  console.log("New admin has role:", hasRole);

  // Optionally revoke from deployer
  console.log("\n3️⃣  Revoking admin role from deployer...");
  tx = await invoiceNFT.revokeRole(ADMIN_ROLE, deployer.address);
  await tx.wait();
  console.log("✅ Admin role revoked from deployer");

  const deployerHasRole = await invoiceNFT.hasRole(ADMIN_ROLE, deployer.address);
  console.log("Deployer still has role:", deployerHasRole);

  console.log("\n✨ Admin transfer complete!\n");
  console.log("Summary:");
  console.log("- RwaVault owner:", await vault.owner());
  console.log("- InvoiceNFT admin:", NEW_ADMIN);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
