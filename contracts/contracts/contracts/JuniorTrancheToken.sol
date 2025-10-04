// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title JuniorTrancheToken
 * @notice ERC-20 token representing junior tranche positions
 * @dev Minting and burning restricted to vault contract
 */
contract JuniorTrancheToken is ERC20, Ownable {
    address public vault;

    event VaultSet(address indexed vault);

    constructor() ERC20("Junior Tranche Token", "JUNIOR") Ownable(msg.sender) {}

    /**
     * @notice Set the vault address (one-time operation)
     * @param _vault Address of the RwaVault contract
     */
    function setVault(address _vault) external onlyOwner {
        require(_vault != address(0), "JuniorTrancheToken: vault is zero address");
        require(vault == address(0), "JuniorTrancheToken: vault already set");
        vault = _vault;
        emit VaultSet(_vault);
    }

    /**
     * @notice Mint tokens to an address
     * @param to Address to receive tokens
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external {
        require(msg.sender == vault, "JuniorTrancheToken: only vault can mint");
        _mint(to, amount);
    }

    /**
     * @notice Burn tokens from an address
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burn(address from, uint256 amount) external {
        require(msg.sender == vault, "JuniorTrancheToken: only vault can burn");
        _burn(from, amount);
    }
}
