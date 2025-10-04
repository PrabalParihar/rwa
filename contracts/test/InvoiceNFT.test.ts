import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { InvoiceNFT } from "../typechain-types";

describe("InvoiceNFT", function () {
  async function deployFixture() {
    const [owner, admin, user1, user2] = await ethers.getSigners();

    const InvoiceNFTFactory = await ethers.getContractFactory("InvoiceNFT");
    const invoiceNFT = await InvoiceNFTFactory.deploy();

    // Grant admin role to admin account
    const ADMIN_ROLE = await invoiceNFT.DEFAULT_ADMIN_ROLE();
    await invoiceNFT.grantRole(ADMIN_ROLE, admin.address);

    return { invoiceNFT, owner, admin, user1, user2, ADMIN_ROLE };
  }

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      const { invoiceNFT } = await loadFixture(deployFixture);
      expect(await invoiceNFT.name()).to.equal("Invoice NFT");
      expect(await invoiceNFT.symbol()).to.equal("INVOICE");
    });

    it("Should grant admin role to deployer", async function () {
      const { invoiceNFT, owner, ADMIN_ROLE } = await loadFixture(deployFixture);
      expect(await invoiceNFT.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Minting", function () {
    it("Should mint invoice with correct metadata", async function () {
      const { invoiceNFT, admin, user1 } = await loadFixture(deployFixture);

      const faceValue = ethers.parseUnits("10000", 6); // 10,000 USDC
      const dueDate = (await time.latest()) + 30 * 24 * 60 * 60; // 30 days from now
      const debtorHash = ethers.keccak256(ethers.toUtf8Bytes("Debtor123"));

      await expect(invoiceNFT.connect(admin).mintInvoice(user1.address, faceValue, dueDate, debtorHash))
        .to.emit(invoiceNFT, "InvoiceMinted")
        .withArgs(0, user1.address, faceValue, dueDate, debtorHash);
    });

    it("Should increment token IDs correctly", async function () {
      const { invoiceNFT, admin, user1, user2 } = await loadFixture(deployFixture);

      const faceValue = ethers.parseUnits("5000", 6);
      const dueDate = (await time.latest()) + 60 * 24 * 60 * 60;
      const debtorHash = ethers.keccak256(ethers.toUtf8Bytes("Debtor456"));

      // Mint first invoice
      await invoiceNFT.connect(admin).mintInvoice(user1.address, faceValue, dueDate, debtorHash);
      expect(await invoiceNFT.ownerOf(0)).to.equal(user1.address);

      // Mint second invoice
      await invoiceNFT.connect(admin).mintInvoice(user2.address, faceValue, dueDate, debtorHash);
      expect(await invoiceNFT.ownerOf(1)).to.equal(user2.address);

      expect(await invoiceNFT.nextTokenId()).to.equal(2);
    });

    it("Should store invoice metadata correctly", async function () {
      const { invoiceNFT, admin, user1 } = await loadFixture(deployFixture);

      const faceValue = ethers.parseUnits("15000", 6);
      const dueDate = (await time.latest()) + 45 * 24 * 60 * 60;
      const debtorHash = ethers.keccak256(ethers.toUtf8Bytes("Debtor789"));

      await invoiceNFT.connect(admin).mintInvoice(user1.address, faceValue, dueDate, debtorHash);

      const [storedFaceValue, storedDueDate, storedDebtorHash] = await invoiceNFT.getInvoice(0);

      expect(storedFaceValue).to.equal(faceValue);
      expect(storedDueDate).to.equal(dueDate);
      expect(storedDebtorHash).to.equal(debtorHash);
    });

    it("Should revert when non-admin tries to mint", async function () {
      const { invoiceNFT, user1 } = await loadFixture(deployFixture);

      const faceValue = ethers.parseUnits("10000", 6);
      const dueDate = (await time.latest()) + 30 * 24 * 60 * 60;
      const debtorHash = ethers.keccak256(ethers.toUtf8Bytes("Debtor"));

      await expect(
        invoiceNFT.connect(user1).mintInvoice(user1.address, faceValue, dueDate, debtorHash)
      ).to.be.reverted;
    });

    it("Should revert when minting to zero address", async function () {
      const { invoiceNFT, admin } = await loadFixture(deployFixture);

      const faceValue = ethers.parseUnits("10000", 6);
      const dueDate = (await time.latest()) + 30 * 24 * 60 * 60;
      const debtorHash = ethers.keccak256(ethers.toUtf8Bytes("Debtor"));

      await expect(
        invoiceNFT.connect(admin).mintInvoice(ethers.ZeroAddress, faceValue, dueDate, debtorHash)
      ).to.be.revertedWith("InvoiceNFT: mint to zero address");
    });

    it("Should revert when face value is zero", async function () {
      const { invoiceNFT, admin, user1 } = await loadFixture(deployFixture);

      const dueDate = (await time.latest()) + 30 * 24 * 60 * 60;
      const debtorHash = ethers.keccak256(ethers.toUtf8Bytes("Debtor"));

      await expect(
        invoiceNFT.connect(admin).mintInvoice(user1.address, 0, dueDate, debtorHash)
      ).to.be.revertedWith("InvoiceNFT: face value must be positive");
    });

    it("Should revert when due date is in the past", async function () {
      const { invoiceNFT, admin, user1 } = await loadFixture(deployFixture);

      const faceValue = ethers.parseUnits("10000", 6);
      const pastDueDate = (await time.latest()) - 1; // 1 second ago
      const debtorHash = ethers.keccak256(ethers.toUtf8Bytes("Debtor"));

      await expect(
        invoiceNFT.connect(admin).mintInvoice(user1.address, faceValue, pastDueDate, debtorHash)
      ).to.be.revertedWith("InvoiceNFT: due date must be in future");
    });
  });

  describe("Transfers", function () {
    it("Should prevent transfers between users", async function () {
      const { invoiceNFT, admin, user1, user2 } = await loadFixture(deployFixture);

      const faceValue = ethers.parseUnits("10000", 6);
      const dueDate = (await time.latest()) + 30 * 24 * 60 * 60;
      const debtorHash = ethers.keccak256(ethers.toUtf8Bytes("Debtor"));

      await invoiceNFT.connect(admin).mintInvoice(user1.address, faceValue, dueDate, debtorHash);

      await expect(
        invoiceNFT.connect(user1).transferFrom(user1.address, user2.address, 0)
      ).to.be.revertedWith("InvoiceNFT: transfers are disabled");
    });

    it("Should allow minting (transfer from zero address)", async function () {
      const { invoiceNFT, admin, user1 } = await loadFixture(deployFixture);

      const faceValue = ethers.parseUnits("10000", 6);
      const dueDate = (await time.latest()) + 30 * 24 * 60 * 60;
      const debtorHash = ethers.keccak256(ethers.toUtf8Bytes("Debtor"));

      await expect(
        invoiceNFT.connect(admin).mintInvoice(user1.address, faceValue, dueDate, debtorHash)
      ).to.not.be.reverted;

      expect(await invoiceNFT.ownerOf(0)).to.equal(user1.address);
    });
  });

  describe("View Functions", function () {
    it("Should return correct invoice metadata", async function () {
      const { invoiceNFT, admin, user1 } = await loadFixture(deployFixture);

      const faceValue = ethers.parseUnits("20000", 6);
      const dueDate = (await time.latest()) + 90 * 24 * 60 * 60;
      const debtorHash = ethers.keccak256(ethers.toUtf8Bytes("DebtorXYZ"));

      await invoiceNFT.connect(admin).mintInvoice(user1.address, faceValue, dueDate, debtorHash);

      const [returnedFaceValue, returnedDueDate, returnedDebtorHash] = await invoiceNFT.getInvoice(0);

      expect(returnedFaceValue).to.equal(faceValue);
      expect(returnedDueDate).to.equal(dueDate);
      expect(returnedDebtorHash).to.equal(debtorHash);
    });

    it("Should revert when querying non-existent token", async function () {
      const { invoiceNFT } = await loadFixture(deployFixture);

      await expect(invoiceNFT.getInvoice(999)).to.be.revertedWith("InvoiceNFT: invalid token ID");
    });

    it("Should return correct next token ID", async function () {
      const { invoiceNFT, admin, user1 } = await loadFixture(deployFixture);

      expect(await invoiceNFT.nextTokenId()).to.equal(0);

      const faceValue = ethers.parseUnits("10000", 6);
      const dueDate = (await time.latest()) + 30 * 24 * 60 * 60;
      const debtorHash = ethers.keccak256(ethers.toUtf8Bytes("Debtor"));

      await invoiceNFT.connect(admin).mintInvoice(user1.address, faceValue, dueDate, debtorHash);

      expect(await invoiceNFT.nextTokenId()).to.equal(1);
    });
  });

  describe("Access Control", function () {
    it("Should allow admin to grant roles", async function () {
      const { invoiceNFT, owner, user1, ADMIN_ROLE } = await loadFixture(deployFixture);

      await invoiceNFT.connect(owner).grantRole(ADMIN_ROLE, user1.address);

      expect(await invoiceNFT.hasRole(ADMIN_ROLE, user1.address)).to.be.true;
    });

    it("Should allow newly granted admin to mint", async function () {
      const { invoiceNFT, owner, user1, user2, ADMIN_ROLE } = await loadFixture(deployFixture);

      await invoiceNFT.connect(owner).grantRole(ADMIN_ROLE, user1.address);

      const faceValue = ethers.parseUnits("10000", 6);
      const dueDate = (await time.latest()) + 30 * 24 * 60 * 60;
      const debtorHash = ethers.keccak256(ethers.toUtf8Bytes("Debtor"));

      await expect(
        invoiceNFT.connect(user1).mintInvoice(user2.address, faceValue, dueDate, debtorHash)
      ).to.not.be.reverted;
    });
  });
});
