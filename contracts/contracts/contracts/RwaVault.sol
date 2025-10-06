// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./SeniorTrancheToken.sol";
import "./JuniorTrancheToken.sol";
import "./InvoiceNFT.sol";

/**
 * @title RwaVault
 * @notice Vault for accepting USDC deposits and issuing tranche tokens
 * @dev Implements waterfall distribution mechanism: Senior paid before Junior
 */
contract RwaVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant ORIGINATION_FEE_BPS = 200; // 2% = 200 basis points
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant SENIOR_APY_BPS = 800; // 8% APY = 800 basis points

    // State variables
    IERC20 public immutable usdc;
    SeniorTrancheToken public immutable seniorToken;
    JuniorTrancheToken public immutable juniorToken;
    InvoiceNFT public invoiceNFT;

    uint256 public totalSeniorShares;
    uint256 public totalJuniorShares;
    uint256 public assetsUnderManagement;

    // Waterfall tracking
    uint256 public seniorPrincipal; // Total principal owed to senior tranche
    uint256 public seniorYieldPaid; // Total yield paid to senior tranche
    uint256 public lastDistributionTime; // Timestamp of last distribution

    // Reward per share tracking (scaled by 1e18 for precision)
    uint256 public seniorRewardPerShare;
    uint256 public juniorRewardPerShare;

    // User reward debt tracking
    mapping(address => uint256) public seniorRewardDebt;
    mapping(address => uint256) public juniorRewardDebt;

    // Invoice financing tracking
    mapping(uint256 => bool) public invoiceFinanced; // tokenId => financed
    mapping(uint256 => uint256) public invoiceRepayments; // tokenId => repaid amount

    // Events
    event Deposited(
        address indexed user,
        bool indexed isSenior,
        uint256 grossAmount,
        uint256 fee,
        uint256 netShares
    );

    event ReturnsDistributed(
        uint256 totalYield,
        uint256 toSenior,
        uint256 toJunior
    );

    event Claimed(
        address indexed user,
        bool indexed isSenior,
        uint256 amount
    );

    event Withdrawn(
        address indexed user,
        bool indexed isSenior,
        uint256 shares,
        uint256 amount
    );

    event InvoiceFinanced(
        uint256 indexed tokenId,
        uint256 amount,
        address indexed financedBy
    );

    event InvoiceRepaid(
        uint256 indexed tokenId,
        uint256 amount,
        address indexed repaidBy
    );

    constructor(
        address _usdc,
        address _seniorToken,
        address _juniorToken
    ) Ownable(msg.sender) {
        require(_usdc != address(0), "RwaVault: USDC is zero address");
        require(_seniorToken != address(0), "RwaVault: senior token is zero address");
        require(_juniorToken != address(0), "RwaVault: junior token is zero address");

        usdc = IERC20(_usdc);
        seniorToken = SeniorTrancheToken(_seniorToken);
        juniorToken = JuniorTrancheToken(_juniorToken);
        lastDistributionTime = block.timestamp;
    }

    /**
     * @notice Deposit USDC and receive tranche tokens
     * @param amount Gross amount of USDC to deposit
     * @param toSenior True for senior tranche, false for junior
     */
    function deposit(uint256 amount, bool toSenior) external nonReentrant {
        require(amount > 0, "RwaVault: amount must be positive");

        // Calculate fee and net amount
        uint256 fee = calculateFee(amount);
        uint256 netAmount = amount - fee;

        // Transfer USDC from user
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // Update AUM
        assetsUnderManagement += netAmount;

        // Mint tranche tokens (1:1 with net USDC deposited)
        if (toSenior) {
            // Claim any pending rewards before changing balance
            _updateRewards(msg.sender, true);

            totalSeniorShares += netAmount;
            seniorPrincipal += netAmount; // Track senior principal for waterfall
            seniorToken.mint(msg.sender, netAmount);

            // Update reward debt
            seniorRewardDebt[msg.sender] = (seniorToken.balanceOf(msg.sender) * seniorRewardPerShare) / 1e18;
        } else {
            // Claim any pending rewards before changing balance
            _updateRewards(msg.sender, false);

            totalJuniorShares += netAmount;
            juniorToken.mint(msg.sender, netAmount);

            // Update reward debt
            juniorRewardDebt[msg.sender] = (juniorToken.balanceOf(msg.sender) * juniorRewardPerShare) / 1e18;
        }

        emit Deposited(msg.sender, toSenior, amount, fee, netAmount);
    }

    /**
     * @notice Withdraw USDC by burning tranche tokens
     * @param shares Amount of tranche tokens to burn
     * @param fromSenior True to withdraw from senior tranche, false for junior
     */
    function withdraw(uint256 shares, bool fromSenior) external nonReentrant {
        require(shares > 0, "RwaVault: shares must be positive");

        // Check user has sufficient balance
        if (fromSenior) {
            require(
                seniorToken.balanceOf(msg.sender) >= shares,
                "RwaVault: insufficient senior tokens"
            );
        } else {
            require(
                juniorToken.balanceOf(msg.sender) >= shares,
                "RwaVault: insufficient junior tokens"
            );
        }

        // Check vault has sufficient USDC
        require(
            usdc.balanceOf(address(this)) >= shares,
            "RwaVault: insufficient vault balance"
        );

        // Claim any pending rewards before changing balance
        _updateRewards(msg.sender, fromSenior);

        // Burn tranche tokens
        if (fromSenior) {
            seniorToken.burn(msg.sender, shares);
            totalSeniorShares -= shares;
            seniorPrincipal -= shares; // Reduce senior principal tracking

            // Update reward debt
            seniorRewardDebt[msg.sender] = (seniorToken.balanceOf(msg.sender) * seniorRewardPerShare) / 1e18;
        } else {
            juniorToken.burn(msg.sender, shares);
            totalJuniorShares -= shares;

            // Update reward debt
            juniorRewardDebt[msg.sender] = (juniorToken.balanceOf(msg.sender) * juniorRewardPerShare) / 1e18;
        }

        // Update AUM
        assetsUnderManagement -= shares;

        // Transfer USDC to user (1:1 ratio)
        usdc.safeTransfer(msg.sender, shares);

        emit Withdrawn(msg.sender, fromSenior, shares, shares);
    }

    /**
     * @notice Calculate origination fee
     * @param amount Gross deposit amount
     * @return fee Fee amount (2% of gross)
     */
    function calculateFee(uint256 amount) public pure returns (uint256) {
        return (amount * ORIGINATION_FEE_BPS) / BPS_DENOMINATOR;
    }

    /**
     * @notice Distribute returns using waterfall mechanism
     * @dev TRUE WATERFALL: Senior paid FIRST (principal + 8% APY), remainder to junior
     * @param totalYield Total yield to distribute (in USDC)
     */
    function distributeReturns(uint256 totalYield) external onlyOwner nonReentrant {
        require(totalYield > 0, "RwaVault: yield must be positive");

        // Transfer yield from caller
        usdc.safeTransferFrom(msg.sender, address(this), totalYield);

        uint256 toSenior = 0;
        uint256 toJunior = 0;

        // WATERFALL LOGIC: Senior gets paid FIRST
        if (totalSeniorShares > 0) {
            // Calculate time-based yield owed to senior (8% APY)
            uint256 timeElapsed = block.timestamp - lastDistributionTime;
            uint256 seniorTargetYield = (seniorPrincipal * SENIOR_APY_BPS * timeElapsed) /
                                        (BPS_DENOMINATOR * 365 days);

            // Senior gets: min(totalYield, targetYield)
            // This ensures senior gets paid FIRST up to their expected return
            toSenior = totalYield < seniorTargetYield ? totalYield : seniorTargetYield;

            // Update tracking
            seniorYieldPaid += toSenior;

            // Distribute to senior holders pro-rata by their shares
            _distributeToTranche(toSenior, totalSeniorShares, true);
        }

        // Junior gets ONLY the remainder (true waterfall)
        toJunior = totalYield - toSenior;

        if (totalJuniorShares > 0 && toJunior > 0) {
            // Distribute remainder to junior holders pro-rata
            _distributeToTranche(toJunior, totalJuniorShares, false);
        }

        // Update last distribution time
        lastDistributionTime = block.timestamp;

        emit ReturnsDistributed(totalYield, toSenior, toJunior);
    }

    /**
     * @notice Internal function to distribute yield to a tranche
     * @dev Updates reward per share for pro-rata distribution
     * @param amount Amount to distribute
     * @param totalShares Total shares in the tranche
     * @param isSenior True for senior, false for junior
     */
    function _distributeToTranche(
        uint256 amount,
        uint256 totalShares,
        bool isSenior
    ) internal {
        if (totalShares == 0) return;

        // Update reward per share (scaled by 1e18 for precision)
        uint256 rewardPerShareIncrease = (amount * 1e18) / totalShares;

        if (isSenior) {
            seniorRewardPerShare += rewardPerShareIncrease;
        } else {
            juniorRewardPerShare += rewardPerShareIncrease;
        }

        // Add to AUM (rewards are now in the vault)
        assetsUnderManagement += amount;
    }

    /**
     * @notice Claim distributed returns
     * @param isSenior True to claim from senior tranche, false for junior
     */
    function claim(bool isSenior) external nonReentrant {
        uint256 claimable = _getPendingRewards(msg.sender, isSenior);
        require(claimable > 0, "RwaVault: nothing to claim");

        // Update reward debt to current
        if (isSenior) {
            seniorRewardDebt[msg.sender] = (seniorToken.balanceOf(msg.sender) * seniorRewardPerShare) / 1e18;
        } else {
            juniorRewardDebt[msg.sender] = (juniorToken.balanceOf(msg.sender) * juniorRewardPerShare) / 1e18;
        }

        usdc.safeTransfer(msg.sender, claimable);

        emit Claimed(msg.sender, isSenior, claimable);
    }

    /**
     * @notice Get user's claimable amount
     * @param user User address
     * @param isSenior True for senior tranche
     * @return Claimable amount in USDC
     */
    function getClaimable(address user, bool isSenior) external view returns (uint256) {
        return _getPendingRewards(user, isSenior);
    }

    /**
     * @notice Internal helper to calculate pending rewards
     * @param user User address
     * @param isSenior True for senior tranche
     * @return Pending rewards in USDC
     */
    function _getPendingRewards(address user, bool isSenior) internal view returns (uint256) {
        if (isSenior) {
            uint256 userBalance = seniorToken.balanceOf(user);
            if (userBalance == 0) return 0;
            uint256 accumulatedRewards = (userBalance * seniorRewardPerShare) / 1e18;
            if (accumulatedRewards <= seniorRewardDebt[user]) return 0;
            return accumulatedRewards - seniorRewardDebt[user];
        } else {
            uint256 userBalance = juniorToken.balanceOf(user);
            if (userBalance == 0) return 0;
            uint256 accumulatedRewards = (userBalance * juniorRewardPerShare) / 1e18;
            if (accumulatedRewards <= juniorRewardDebt[user]) return 0;
            return accumulatedRewards - juniorRewardDebt[user];
        }
    }

    /**
     * @notice Internal helper to update and transfer pending rewards
     * @param user User address
     * @param isSenior True for senior tranche
     */
    function _updateRewards(address user, bool isSenior) internal {
        uint256 pending = _getPendingRewards(user, isSenior);
        if (pending > 0) {
            usdc.safeTransfer(user, pending);
            emit Claimed(user, isSenior, pending);
        }
    }

    /**
     * @notice Preview deposit - calculate net shares after fee
     * @param amount Gross deposit amount
     * @return netShares Net shares to receive
     * @return fee Fee amount
     */
    function previewDeposit(uint256 amount) external pure returns (uint256 netShares, uint256 fee) {
        fee = calculateFee(amount);
        netShares = amount - fee;
        return (netShares, fee);
    }

    /**
     * @notice Get total value locked in vault
     */
    function getTotalValueLocked() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    /**
     * @notice Get senior tranche info
     */
    function getSeniorInfo() external view returns (uint256 totalShares, uint256 supply) {
        return (totalSeniorShares, seniorToken.totalSupply());
    }

    /**
     * @notice Get junior tranche info
     */
    function getJuniorInfo() external view returns (uint256 totalShares, uint256 supply) {
        return (totalJuniorShares, juniorToken.totalSupply());
    }

    /**
     * @notice Set the InvoiceNFT contract address
     * @dev Can only be called once by owner
     */
    function setInvoiceNFT(address _invoiceNFT) external onlyOwner {
        require(address(invoiceNFT) == address(0), "RwaVault: InvoiceNFT already set");
        require(_invoiceNFT != address(0), "RwaVault: invalid address");
        invoiceNFT = InvoiceNFT(_invoiceNFT);
    }

    /**
     * @notice Finance an invoice using vault funds
     * @param tokenId Invoice NFT token ID
     */
    function financeInvoice(uint256 tokenId) external onlyOwner nonReentrant {
        require(address(invoiceNFT) != address(0), "RwaVault: InvoiceNFT not set");
        require(!invoiceFinanced[tokenId], "RwaVault: invoice already financed");

        // Get invoice details
        (uint256 faceValue, uint256 dueDate, ) = invoiceNFT.getInvoice(tokenId);
        require(block.timestamp < dueDate, "RwaVault: invoice past due");

        // Check vault has sufficient funds
        require(usdc.balanceOf(address(this)) >= faceValue, "RwaVault: insufficient funds");

        // Mark as financed
        invoiceFinanced[tokenId] = true;

        // Transfer funds to invoice owner
        address invoiceOwner = IERC721(address(invoiceNFT)).ownerOf(tokenId);
        usdc.safeTransfer(invoiceOwner, faceValue);

        emit InvoiceFinanced(tokenId, faceValue, msg.sender);
    }

    /**
     * @notice Repay an invoice
     * @param tokenId Invoice NFT token ID
     * @param amount Amount to repay in USDC
     */
    function repayInvoice(uint256 tokenId, uint256 amount) external nonReentrant {
        require(address(invoiceNFT) != address(0), "RwaVault: InvoiceNFT not set");
        require(invoiceFinanced[tokenId], "RwaVault: invoice not financed");

        (uint256 faceValue, , ) = invoiceNFT.getInvoice(tokenId);
        uint256 alreadyRepaid = invoiceRepayments[tokenId];
        require(alreadyRepaid < faceValue, "RwaVault: invoice fully repaid");
        require(amount > 0, "RwaVault: amount must be positive");

        uint256 remaining = faceValue - alreadyRepaid;
        uint256 actualRepayment = amount > remaining ? remaining : amount;

        // Transfer repayment from caller
        usdc.safeTransferFrom(msg.sender, address(this), actualRepayment);

        // Update repayment tracking
        invoiceRepayments[tokenId] += actualRepayment;

        emit InvoiceRepaid(tokenId, actualRepayment, msg.sender);

        // Repayment is now in vault - owner can distribute it via distributeReturns()
    }

    /**
     * @notice Check if invoice is financed
     */
    function isInvoiceFinanced(uint256 tokenId) external view returns (bool) {
        return invoiceFinanced[tokenId];
    }

    /**
     * @notice Check if invoice is fully repaid
     */
    function isInvoiceRepaid(uint256 tokenId) external view returns (bool) {
        if (!invoiceFinanced[tokenId]) return false;
        (uint256 faceValue, , ) = invoiceNFT.getInvoice(tokenId);
        return invoiceRepayments[tokenId] >= faceValue;
    }

    /**
     * @notice Check if invoice is defaulted (past due and not fully repaid)
     */
    function isInvoiceDefaulted(uint256 tokenId) external view returns (bool) {
        if (!invoiceFinanced[tokenId]) return false;
        (, uint256 dueDate, ) = invoiceNFT.getInvoice(tokenId);
        (uint256 faceValue, , ) = invoiceNFT.getInvoice(tokenId);
        return block.timestamp > dueDate && invoiceRepayments[tokenId] < faceValue;
    }

    /**
     * @notice Get current senior yield owed (based on 8% APY and time elapsed)
     */
    function getSeniorYieldOwed() external view returns (uint256) {
        if (totalSeniorShares == 0) return 0;
        uint256 timeElapsed = block.timestamp - lastDistributionTime;
        return (seniorPrincipal * SENIOR_APY_BPS * timeElapsed) /
               (BPS_DENOMINATOR * 365 days);
    }

    /**
     * @notice Get waterfall status
     * @return _seniorPrincipal Total principal owed to senior
     * @return _seniorYieldPaid Total yield paid to senior so far
     * @return _seniorYieldOwed Current yield owed to senior (time-based)
     * @return _lastDistribution Timestamp of last distribution
     */
    function getWaterfallStatus() external view returns (
        uint256 _seniorPrincipal,
        uint256 _seniorYieldPaid,
        uint256 _seniorYieldOwed,
        uint256 _lastDistribution
    ) {
        uint256 timeElapsed = block.timestamp - lastDistributionTime;
        uint256 yieldOwed = totalSeniorShares == 0 ? 0 :
            (seniorPrincipal * SENIOR_APY_BPS * timeElapsed) / (BPS_DENOMINATOR * 365 days);

        return (
            seniorPrincipal,
            seniorYieldPaid,
            yieldOwed,
            lastDistributionTime
        );
    }
}
