import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🔄 Transferring tranche token ownership...\n");

  const NEW_ADMIN = "0xE5FB6be08698719926C54ccC2BF857Bfe8Af0eD8";

  // Read deployment info
  const deploymentFile = path.join(__dirname, "../deployments/latest.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));

  const [deployer] = await ethers.getSigners();
  console.log("Current owner:", deployer.address);
  console.log("New owner:", NEW_ADMIN);

  // Get contract instances
  const seniorToken = await ethers.getContractAt("SeniorTrancheToken", deployment.contracts.SeniorTrancheToken);
  const juniorToken = await ethers.getContractAt("JuniorTrancheToken", deployment.contracts.JuniorTrancheToken);

  // Transfer Senior Token ownership
  console.log("\n1️⃣  Transferring SeniorTrancheToken ownership...");
  let tx = await seniorToken.transferOwnership(NEW_ADMIN);
  await tx.wait();
  console.log("✅ SeniorTrancheToken ownership transferred");
  console.log("New owner:", await seniorToken.owner());

  // Transfer Junior Token ownership
  console.log("\n2️⃣  Transferring JuniorTrancheToken ownership...");
  tx = await juniorToken.transferOwnership(NEW_ADMIN);
  await tx.wait();
  console.log("✅ JuniorTrancheToken ownership transferred");
  console.log("New owner:", await juniorToken.owner());

  console.log("\n✨ Tranche token ownership transfer complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
