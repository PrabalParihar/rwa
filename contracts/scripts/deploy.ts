import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Starting RWA Platform deployment...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // 1. Deploy Mock USDC
  console.log("1️⃣  Deploying MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("✅ MockUSDC deployed to:", usdcAddress);

  // 2. Deploy Senior Tranche Token
  console.log("\n2️⃣  Deploying SeniorTrancheToken...");
  const SeniorTrancheToken = await ethers.getContractFactory("SeniorTrancheToken");
  const seniorToken = await SeniorTrancheToken.deploy();
  await seniorToken.waitForDeployment();
  const seniorAddress = await seniorToken.getAddress();
  console.log("✅ SeniorTrancheToken deployed to:", seniorAddress);

  // 3. Deploy Junior Tranche Token
  console.log("\n3️⃣  Deploying JuniorTrancheToken...");
  const JuniorTrancheToken = await ethers.getContractFactory("JuniorTrancheToken");
  const juniorToken = await JuniorTrancheToken.deploy();
  await juniorToken.waitForDeployment();
  const juniorAddress = await juniorToken.getAddress();
  console.log("✅ JuniorTrancheToken deployed to:", juniorAddress);

  // 4. Deploy RwaVault
  console.log("\n4️⃣  Deploying RwaVault...");
  const RwaVault = await ethers.getContractFactory("RwaVault");
  const vault = await RwaVault.deploy(usdcAddress, seniorAddress, juniorAddress);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("✅ RwaVault deployed to:", vaultAddress);

  // 5. Set vault address in tranche tokens
  console.log("\n5️⃣  Configuring tranche tokens...");
  let tx = await seniorToken.setVault(vaultAddress);
  await tx.wait();
  console.log("✅ Senior token vault set");

  tx = await juniorToken.setVault(vaultAddress);
  await tx.wait();
  console.log("✅ Junior token vault set");

  // 6. Deploy InvoiceNFT
  console.log("\n6️⃣  Deploying InvoiceNFT...");
  const InvoiceNFT = await ethers.getContractFactory("InvoiceNFT");
  const invoiceNFT = await InvoiceNFT.deploy();
  await invoiceNFT.waitForDeployment();
  const invoiceAddress = await invoiceNFT.getAddress();
  console.log("✅ InvoiceNFT deployed to:", invoiceAddress);

  // Create deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      MockUSDC: usdcAddress,
      SeniorTrancheToken: seniorAddress,
      JuniorTrancheToken: juniorAddress,
      RwaVault: vaultAddress,
      InvoiceNFT: invoiceAddress,
    },
  };

  // Save deployment addresses
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, "latest.json");
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n📝 Deployment Summary");
  console.log("═".repeat(60));
  console.log("MockUSDC:              ", usdcAddress);
  console.log("SeniorTrancheToken:    ", seniorAddress);
  console.log("JuniorTrancheToken:    ", juniorAddress);
  console.log("RwaVault:              ", vaultAddress);
  console.log("InvoiceNFT:            ", invoiceAddress);
  console.log("═".repeat(60));
  console.log("\n💾 Deployment info saved to:", deploymentFile);

  console.log("\n🎯 Next Steps:");
  console.log("1. Update frontend .env.local with these addresses");
  console.log("2. Mint some USDC for testing: await usdc.mint(YOUR_ADDRESS, amount)");
  console.log("3. Start the frontend and connect your wallet");

  console.log("\n✨ Deployment complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
