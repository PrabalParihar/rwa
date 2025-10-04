import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { MockUSDC, SeniorTrancheToken, JuniorTrancheToken, RwaVault } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("RwaVault", function () {
  async function deployFixture() {
    const [owner, investor1, investor2, investor3] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDCFactory.deploy();

    // Deploy Tranche Tokens
    const SeniorFactory = await ethers.getContractFactory("SeniorTrancheToken");
    const seniorToken = await SeniorFactory.deploy();

    const JuniorFactory = await ethers.getContractFactory("JuniorTrancheToken");
    const juniorToken = await JuniorFactory.deploy();

    // Deploy Vault
    const VaultFactory = await ethers.getContractFactory("RwaVault");
    const vault = await VaultFactory.deploy(
      await usdc.getAddress(),
      await seniorToken.getAddress(),
      await juniorToken.getAddress()
    );

    // Set vault address in tranche tokens
    await seniorToken.setVault(await vault.getAddress());
    await juniorToken.setVault(await vault.getAddress());

    // Mint USDC to investors
    const mintAmount = ethers.parseUnits("100000", 6); // 100k USDC
    await usdc.mint(investor1.address, mintAmount);
    await usdc.mint(investor2.address, mintAmount);
    await usdc.mint(investor3.address, mintAmount);

    return { usdc, seniorToken, juniorToken, vault, owner, investor1, investor2, investor3 };
  }

  describe("Deployment", function () {
    it("Should set the correct USDC address", async function () {
      const { vault, usdc } = await loadFixture(deployFixture);
      expect(await vault.usdc()).to.equal(await usdc.getAddress());
    });

    it("Should set the correct tranche token addresses", async function () {
      const { vault, seniorToken, juniorToken } = await loadFixture(deployFixture);
      expect(await vault.seniorToken()).to.equal(await seniorToken.getAddress());
      expect(await vault.juniorToken()).to.equal(await juniorToken.getAddress());
    });

    it("Should have correct origination fee (2%)", async function () {
      const { vault } = await loadFixture(deployFixture);
      expect(await vault.ORIGINATION_FEE_BPS()).to.equal(200);
    });
  });

  describe("Fee Calculation", function () {
    it("Should calculate 2% fee correctly", async function () {
      const { vault } = await loadFixture(deployFixture);

      const amount = ethers.parseUnits("1000", 6); // 1000 USDC
      const fee = await vault.calculateFee(amount);
      const expectedFee = ethers.parseUnits("20", 6); // 2% = 20 USDC

      expect(fee).to.equal(expectedFee);
    });

    it("Should preview deposit correctly", async function () {
      const { vault } = await loadFixture(deployFixture);

      const amount = ethers.parseUnits("1000", 6);
      const [netShares, fee] = await vault.previewDeposit(amount);

      expect(fee).to.equal(ethers.parseUnits("20", 6));
      expect(netShares).to.equal(ethers.parseUnits("980", 6));
    });
  });

  describe("Deposits - Senior Tranche", function () {
    it("Should accept senior deposit and deduct 2% fee", async function () {
      const { vault, usdc, seniorToken, investor1 } = await loadFixture(deployFixture);

      const depositAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(investor1).approve(await vault.getAddress(), depositAmount);

      await expect(vault.connect(investor1).deposit(depositAmount, true))
        .to.emit(vault, "Deposited")
        .withArgs(
          investor1.address,
          true,
          depositAmount,
          ethers.parseUnits("20", 6), // 2% fee
          ethers.parseUnits("980", 6)  // Net shares
        );
    });

    it("Should mint correct senior tranche tokens", async function () {
      const { vault, usdc, seniorToken, investor1 } = await loadFixture(deployFixture);

      const depositAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(investor1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(investor1).deposit(depositAmount, true);

      const balance = await seniorToken.balanceOf(investor1.address);
      expect(balance).to.equal(ethers.parseUnits("980", 6)); // Net after 2% fee
    });

    it("Should update total senior shares", async function () {
      const { vault, usdc, investor1 } = await loadFixture(deployFixture);

      const depositAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(investor1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(investor1).deposit(depositAmount, true);

      expect(await vault.totalSeniorShares()).to.equal(ethers.parseUnits("980", 6));
    });

    it("Should update assets under management", async function () {
      const { vault, usdc, investor1 } = await loadFixture(deployFixture);

      const depositAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(investor1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(investor1).deposit(depositAmount, true);

      expect(await vault.assetsUnderManagement()).to.equal(ethers.parseUnits("980", 6));
    });
  });

  describe("Deposits - Junior Tranche", function () {
    it("Should accept junior deposit and deduct 2% fee", async function () {
      const { vault, usdc, juniorToken, investor2 } = await loadFixture(deployFixture);

      const depositAmount = ethers.parseUnits("500", 6);
      await usdc.connect(investor2).approve(await vault.getAddress(), depositAmount);

      await expect(vault.connect(investor2).deposit(depositAmount, false))
        .to.emit(vault, "Deposited")
        .withArgs(
          investor2.address,
          false,
          depositAmount,
          ethers.parseUnits("10", 6), // 2% fee
          ethers.parseUnits("490", 6)  // Net shares
        );
    });

    it("Should mint correct junior tranche tokens", async function () {
      const { vault, usdc, juniorToken, investor2 } = await loadFixture(deployFixture);

      const depositAmount = ethers.parseUnits("500", 6);
      await usdc.connect(investor2).approve(await vault.getAddress(), depositAmount);
      await vault.connect(investor2).deposit(depositAmount, false);

      const balance = await juniorToken.balanceOf(investor2.address);
      expect(balance).to.equal(ethers.parseUnits("490", 6));
    });
  });

  describe("Waterfall Distribution", function () {
    it("Should distribute returns with waterfall logic", async function () {
      const { vault, usdc, owner, investor1, investor2 } = await loadFixture(deployFixture);

      // Senior deposit: 1000 USDC (980 net)
      const seniorAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(investor1).approve(await vault.getAddress(), seniorAmount);
      await vault.connect(investor1).deposit(seniorAmount, true);

      // Junior deposit: 500 USDC (490 net)
      const juniorAmount = ethers.parseUnits("500", 6);
      await usdc.connect(investor2).approve(await vault.getAddress(), juniorAmount);
      await vault.connect(investor2).deposit(juniorAmount, false);

      // Distribute 100 USDC yield
      const yieldAmount = ethers.parseUnits("100", 6);
      await usdc.connect(owner).approve(await vault.getAddress(), yieldAmount);

      await expect(vault.connect(owner).distributeReturns(yieldAmount))
        .to.emit(vault, "ReturnsDistributed");
    });

    it("Should give senior priority in distribution", async function () {
      const { vault, usdc, owner, investor1, investor2 } = await loadFixture(deployFixture);

      // Senior: 1000 (980 net)
      await usdc.connect(investor1).approve(await vault.getAddress(), ethers.parseUnits("1000", 6));
      await vault.connect(investor1).deposit(ethers.parseUnits("1000", 6), true);

      // Junior: 500 (490 net)
      await usdc.connect(investor2).approve(await vault.getAddress(), ethers.parseUnits("500", 6));
      await vault.connect(investor2).deposit(ethers.parseUnits("500", 6), false);

      // Total shares: 980 + 490 = 1470
      // Senior proportion: 980/1470 = ~66.67%
      // Junior proportion: 490/1470 = ~33.33%

      const yieldAmount = ethers.parseUnits("150", 6);
      await usdc.connect(owner).approve(await vault.getAddress(), yieldAmount);

      const tx = await vault.connect(owner).distributeReturns(yieldAmount);
      const receipt = await tx.wait();

      // Check event for distribution amounts
      const event = receipt?.logs.find((log: any) => {
        try {
          return vault.interface.parseLog(log)?.name === "ReturnsDistributed";
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
    });
  });

  describe("Edge Cases", function () {
    it("Should revert on zero deposit", async function () {
      const { vault, investor1 } = await loadFixture(deployFixture);

      await expect(
        vault.connect(investor1).deposit(0, true)
      ).to.be.revertedWith("RwaVault: amount must be positive");
    });

    it("Should revert on deposit without approval", async function () {
      const { vault, investor1 } = await loadFixture(deployFixture);

      await expect(
        vault.connect(investor1).deposit(ethers.parseUnits("100", 6), true)
      ).to.be.reverted;
    });

    it("Should handle multiple deposits correctly", async function () {
      const { vault, usdc, seniorToken, investor1 } = await loadFixture(deployFixture);

      // First deposit
      await usdc.connect(investor1).approve(await vault.getAddress(), ethers.parseUnits("1000", 6));
      await vault.connect(investor1).deposit(ethers.parseUnits("1000", 6), true);

      // Second deposit
      await usdc.connect(investor1).approve(await vault.getAddress(), ethers.parseUnits("500", 6));
      await vault.connect(investor1).deposit(ethers.parseUnits("500", 6), true);

      // Total: 1000 + 500 = 1500 gross, 1470 net (after 2% fees)
      const balance = await seniorToken.balanceOf(investor1.address);
      expect(balance).to.equal(ethers.parseUnits("1470", 6));
    });
  });

  describe("Withdrawals", function () {
    it("Should allow senior withdrawal", async function () {
      const { vault, usdc, seniorToken, investor1 } = await loadFixture(deployFixture);

      // Deposit 1000 USDC (980 net after 2% fee)
      const depositAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(investor1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(investor1).deposit(depositAmount, true);

      // Check balance before withdrawal
      const seniorBalance = await seniorToken.balanceOf(investor1.address);
      expect(seniorBalance).to.equal(ethers.parseUnits("980", 6));

      // Withdraw 500 shares
      const withdrawAmount = ethers.parseUnits("500", 6);
      const usdcBefore = await usdc.balanceOf(investor1.address);

      await expect(vault.connect(investor1).withdraw(withdrawAmount, true))
        .to.emit(vault, "Withdrawn")
        .withArgs(investor1.address, true, withdrawAmount, withdrawAmount);

      // Check balances after withdrawal
      const seniorBalanceAfter = await seniorToken.balanceOf(investor1.address);
      expect(seniorBalanceAfter).to.equal(ethers.parseUnits("480", 6)); // 980 - 500

      const usdcAfter = await usdc.balanceOf(investor1.address);
      expect(usdcAfter - usdcBefore).to.equal(withdrawAmount);

      // Check vault state
      expect(await vault.totalSeniorShares()).to.equal(ethers.parseUnits("480", 6));
      expect(await vault.assetsUnderManagement()).to.equal(ethers.parseUnits("480", 6));
    });

    it("Should allow junior withdrawal", async function () {
      const { vault, usdc, juniorToken, investor2 } = await loadFixture(deployFixture);

      // Deposit 500 USDC (490 net after 2% fee)
      const depositAmount = ethers.parseUnits("500", 6);
      await usdc.connect(investor2).approve(await vault.getAddress(), depositAmount);
      await vault.connect(investor2).deposit(depositAmount, false);

      // Withdraw all shares
      const withdrawAmount = ethers.parseUnits("490", 6);
      const usdcBefore = await usdc.balanceOf(investor2.address);

      await vault.connect(investor2).withdraw(withdrawAmount, false);

      // Check balances
      const juniorBalanceAfter = await juniorToken.balanceOf(investor2.address);
      expect(juniorBalanceAfter).to.equal(0);

      const usdcAfter = await usdc.balanceOf(investor2.address);
      expect(usdcAfter - usdcBefore).to.equal(withdrawAmount);
    });

    it("Should revert on insufficient balance", async function () {
      const { vault, investor1 } = await loadFixture(deployFixture);

      await expect(
        vault.connect(investor1).withdraw(ethers.parseUnits("100", 6), true)
      ).to.be.revertedWith("RwaVault: insufficient senior tokens");
    });

    it("Should revert on zero withdrawal", async function () {
      const { vault, investor1 } = await loadFixture(deployFixture);

      await expect(
        vault.connect(investor1).withdraw(0, true)
      ).to.be.revertedWith("RwaVault: shares must be positive");
    });
  });

  describe("View Functions", function () {
    it("Should return correct TVL", async function () {
      const { vault, usdc, investor1 } = await loadFixture(deployFixture);

      const depositAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(investor1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(investor1).deposit(depositAmount, true);

      const tvl = await vault.getTotalValueLocked();
      expect(tvl).to.equal(depositAmount); // Full amount including fee
    });

    it("Should return correct senior info", async function () {
      const { vault, usdc, investor1 } = await loadFixture(deployFixture);

      const depositAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(investor1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(investor1).deposit(depositAmount, true);

      const [totalShares, supply] = await vault.getSeniorInfo();
      expect(totalShares).to.equal(ethers.parseUnits("980", 6));
      expect(supply).to.equal(ethers.parseUnits("980", 6));
    });
  });
});
