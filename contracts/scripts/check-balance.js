const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("\n📍 Deployer address:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Sepolia ETH balance:", ethers.formatEther(balance), "ETH\n");

  if (balance < ethers.parseEther("0.05")) {
    console.log("⚠️  WARNING: You need at least 0.05 ETH to deploy all contracts");
    console.log("Get free Sepolia ETH from:");
    console.log("  - https://sepoliafaucet.com/");
    console.log("  - https://www.infura.io/faucet/sepolia");
    console.log("  - https://sepolia-faucet.pk910.de/\n");
    process.exit(1);
  } else {
    console.log("✅ Sufficient balance for deployment!");
    console.log("You can now run: pnpm deploy:sepolia\n");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
