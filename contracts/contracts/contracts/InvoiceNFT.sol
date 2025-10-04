// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title InvoiceNFT
 * @notice ERC-721 NFT representing real-world invoices
 * @dev Each token stores invoice metadata: faceValue, dueDate, and debtorHash
 */
contract InvoiceNFT is ERC721, AccessControl {
    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;

    struct InvoiceMeta {
        uint256 faceValue;  // Invoice amount in USDC (6 decimals)
        uint256 dueDate;    // Invoice maturity timestamp
        bytes32 debtorHash; // Hashed debtor identifier for privacy
    }

    // Token ID counter
    uint256 private _nextTokenId;

    // Mapping from token ID to invoice metadata
    mapping(uint256 => InvoiceMeta) private _invoices;

    // Events
    event InvoiceMinted(
        uint256 indexed tokenId,
        address indexed to,
        uint256 faceValue,
        uint256 dueDate,
        bytes32 debtorHash
    );

    constructor() ERC721("Invoice NFT", "INVOICE") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Mint a new invoice NFT
     * @param to Address to receive the NFT
     * @param faceValue Invoice amount in USDC
     * @param dueDate Invoice maturity timestamp
     * @param debtorHash Hashed identifier of the debtor
     * @return tokenId The ID of the newly minted token
     */
    function mintInvoice(
        address to,
        uint256 faceValue,
        uint256 dueDate,
        bytes32 debtorHash
    ) external onlyRole(ADMIN_ROLE) returns (uint256) {
        require(to != address(0), "InvoiceNFT: mint to zero address");
        require(faceValue > 0, "InvoiceNFT: face value must be positive");
        require(dueDate > block.timestamp, "InvoiceNFT: due date must be in future");

        uint256 tokenId = _nextTokenId++;

        _invoices[tokenId] = InvoiceMeta({
            faceValue: faceValue,
            dueDate: dueDate,
            debtorHash: debtorHash
        });

        _safeMint(to, tokenId);

        emit InvoiceMinted(tokenId, to, faceValue, dueDate, debtorHash);

        return tokenId;
    }

    /**
     * @notice Get invoice metadata for a token
     * @param tokenId The token ID to query
     * @return faceValue Invoice amount
     * @return dueDate Invoice maturity date
     * @return debtorHash Hashed debtor identifier
     */
    function getInvoice(uint256 tokenId)
        external
        view
        returns (
            uint256 faceValue,
            uint256 dueDate,
            bytes32 debtorHash
        )
    {
        require(_ownerOf(tokenId) != address(0), "InvoiceNFT: invalid token ID");

        InvoiceMeta memory invoice = _invoices[tokenId];
        return (invoice.faceValue, invoice.dueDate, invoice.debtorHash);
    }

    /**
     * @notice Get the next token ID to be minted
     */
    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @notice Override to disable transfers (invoices are non-transferable after mint)
     * @dev Comment out this function if you want to allow secondary trading
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);

        // Allow minting (from == address(0)) but prevent transfers
        if (from != address(0) && to != address(0)) {
            revert("InvoiceNFT: transfers are disabled");
        }

        return super._update(to, tokenId, auth);
    }

    /**
     * @notice Required override for AccessControl
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
