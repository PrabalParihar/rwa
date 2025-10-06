import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("💰 Minting USDC on Sepolia...\n");

  const deploymentFile = path.join(__dirname, "../deployments/latest.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));

  const [signer] = await ethers.getSigners();
  console.log("Minting for account:", signer.address);

  // Get USDC contract
  const usdc = await ethers.getContractAt("MockUSDC", deployment.contracts.MockUSDC);

  // Mint 100,000 USDC
  console.log("\n💵 Minting 100,000 USDC...");
  const tx = await usdc.mint(signer.address, ethers.parseUnits("100000", 6));
  await tx.wait();

  const balance = await usdc.balanceOf(signer.address);
  console.log("✅ USDC Balance:", ethers.formatUnits(balance, 6));

  console.log("\n✨ Done! You can now deposit to the vault.\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
