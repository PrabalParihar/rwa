const { ethers } = require("hardhat");

async function main() {
  const recipientAddress = "0xE5FB6be08698719926C54ccC2BF857Bfe8Af0eD8";
  const amount = ethers.parseUnits("1000", 6); // 1000 USDC (6 decimals)
  
  console.log("\n💰 Minting Mock USDC...");
  console.log("Recipient:", recipientAddress);
  console.log("Amount: 1000 USDC\n");

  // Get the deployed MockUSDC address
  const usdcAddress = "0xbf22A0F413410eA8c27C7998c3F757463e2489b8";
  
  // Get contract instance
  const MockUSDC = await ethers.getContractAt("MockUSDC", usdcAddress);
  
  // Mint tokens
  const tx = await MockUSDC.mint(recipientAddress, amount);
  console.log("Transaction hash:", tx.hash);
  
  // Wait for confirmation
  await tx.wait();
  console.log("✅ Transaction confirmed!");
  
  // Check balance
  const balance = await MockUSDC.balanceOf(recipientAddress);
  console.log("\n📊 New balance:", ethers.formatUnits(balance, 6), "USDC\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
