import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const deploymentPath = path.join(__dirname, "../deployments/latest.json");
  const deploymentData = fs.readFileSync(deploymentPath, "utf8");
  const deployment = JSON.parse(deploymentData);

  const vaultAddress = deployment.contracts.RwaVault;
  const invoiceNFTAddress = deployment.contracts.InvoiceNFT;

  console.log("🔗 Setting InvoiceNFT address on RwaVault...");
  console.log("Vault:", vaultAddress);
  console.log("InvoiceNFT:", invoiceNFTAddress);

  const vault = await ethers.getContractAt("RwaVault", vaultAddress);
  const tx = await vault.setInvoiceNFT(invoiceNFTAddress);
  await tx.wait();

  console.log("✅ InvoiceNFT address set successfully!");
  console.log("Transaction hash:", tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
