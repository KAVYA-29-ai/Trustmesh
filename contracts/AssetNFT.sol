// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * AssetNFT.sol — CONTRACT_NFT
 * ============================
 * REVISION NOTE (v2, corrected against the real DIDRegistry.sol /
 * PolicyEngine.sol uploads — v1 was written against ARCHITECTURE.md's
 * illustrative snippet before those files existed and got two things
 * wrong):
 *
 *  1. `did` is typed `address`, not `bytes32` — matches did:ethr, where
 *     the DID identifier IS the identity's Ethereum address. This is a
 *     straight correction, not a design choice.
 *
 *  2. v1 had a `rebindToController()` function that re-anchored the
 *     ERC-721 owner to a DID's "current controller" after key rotation.
 *     That solved a problem this design doesn't have: with did:ethr, the
 *     identity address itself never changes on rotation or on a future
 *     Sentinel Protocol recovery (DIDRegistry.recoverOwnership(), once
 *     built, only ever updates `owners[identity]`, never `identity`).
 *     So this version mints directly to the DID's identity address —
 *     that binding is permanent by construction, and there is nothing
 *     to re-sync, ever. Removed entirely rather than kept "just in case."
 *
 * REVISION NOTE (v3, fixing two CRITICAL findings from docs/SECURITY.md
 * Section 3, written against this exact v2 file):
 *
 *  3. `mintTo`/`transferWithAccessCheck` took `callerDid` as a bare
 *     calldata parameter and passed it straight into
 *     `policyEngine.checkAccess()` with no check that `msg.sender`
 *     actually controlled it — anyone could act as any address that
 *     already held the relevant permission. Fixed by requiring
 *     `msg.sender == didRegistry.identityOwner(callerDid)`, which uses
 *     `didRegistry` (previously stored but unused) and, because
 *     `identityOwner()` already resolves through key rotation, keeps
 *     working after a rotation without this contract needing to know
 *     about it. This does NOT yet cover the meta-tx/relayer pattern
 *     `DIDRegistry`'s `*Signed` functions support elsewhere — a caller
 *     must transact from their own controlling key directly. Extending
 *     this to signature-based calls (so a relayer can submit on a DID
 *     owner's behalf) is a follow-up, not done here, since it changes
 *     the calldata shape both SDKs (3.8) would need to match.
 *
 *  4. `transferWithAccessCheck` checked `callerDid`'s permission in the
 *     caller-supplied `orgId` but never verified that `orgId` matched
 *     `tokenOrgId[tokenId]` — a caller with TRANSFER permission in their
 *     own org could move a token that belonged to a different org,
 *     breaking the orgId-isolation guarantee multi-tenancy depends on.
 *     Fixed by requiring `tokenOrgId[tokenId] == orgId` up front. Also
 *     switched `_ownerOf(tokenId)` to `_requireOwned(tokenId)` for the
 *     `from` lookup, since `_ownerOf` silently returns `address(0)` for
 *     a nonexistent token instead of reverting — that combined with no
 *     org check meant a transfer call for an unminted tokenId could
 *     previously appear to "succeed" in ways that weren't reasoned
 *     about.
 *
 * LIVENESS CHECK: `DIDRegistry.isActive()` is checked before minting or
 * transferring to a recipient DID. ERC-1056 identities are active by default
 * and become inactive only when their current controller revokes them.
 */

interface IPolicyEngine {
    function checkAccess(
        bytes32 orgId,
        address did,
        bytes32 resourceId,
        string calldata action
    ) external view returns (bool);
}

interface IDIDRegistry {
    function identityOwner(address identity) external view returns (address);
    function isActive(address identity) external view returns (bool);
}

interface IAuditLogger {
    function logEvent(
        bytes32 orgId,
        string calldata eventType,
        address subjectDid,
        bytes calldata data
    ) external;

    function logTypedEvent(
        bytes32 orgId,
        bytes32 action,
        bytes32 resourceType,
        bytes32 resourceId,
        address subjectDid,
        bool success,
        bytes calldata data
    ) external;
}

/// @title AssetNFT — CONTRACT_NFT
/// @notice ERC-721 asset bound to a DID's identity address. Unlike a plain
/// NFT (bound to whichever key happens to hold it), this is minted directly
/// to the did:ethr identity address, which is permanent across key rotation
/// and recovery — only `DIDRegistry.owners[identity]` (who *controls* the
/// identity) changes, never the identity address itself.
contract AssetNFT is ERC721 {
    IPolicyEngine public immutable policyEngine;
    IDIDRegistry public immutable didRegistry; // now used: verifies msg.sender controls callerDid (v3 fix)
    IAuditLogger public auditLogger;

    /// @dev resourceId used in CORE_ACCESS_CALL for every NFT-gated action.
    bytes32 public constant RESOURCE_TYPE_NFT = keccak256("NFT");

    string private constant ACTION_CREATE = "CREATE";
    string private constant ACTION_TRANSFER = "TRANSFER";

    bytes32 public constant AUDIT_ACTION_ASSET_MINTED = keccak256("ASSET_MINTED");
    bytes32 public constant AUDIT_ACTION_ASSET_TRANSFERRED = keccak256("ASSET_TRANSFERRED");

    uint256 private _nextTokenId = 1;

    /// @notice Tenant scope for a token, mirrors PolicyEngine's orgId isolation.
    mapping(uint256 => bytes32) public tokenOrgId;

    /// @notice IPFS hash/CID of the metadata JSON. Only the hash lives
    /// on-chain; the metadata content itself is off-chain (Layer 2, IPFS).
    mapping(uint256 => string) private _metadataHash;

    event AssetMinted(
        uint256 indexed tokenId,
        address indexed did,
        bytes32 indexed orgId,
        string metadataHash,
        address mintedBy
    );

    event AssetTransferred(
        uint256 indexed tokenId,
        address indexed fromDid,
        address indexed toDid
    );

    error AccessDenied();
    error NotCallerDidOwner();
    error WrongOrg();
    error ZeroRecipientDid();
    error InactiveRecipientDid();

    constructor(
        address policyEngineAddr,
        address didRegistryAddr,
        address auditLoggerAddr
    ) ERC721("TrustLayer Asset", "TLA") {
        policyEngine = IPolicyEngine(policyEngineAddr);
        didRegistry = IDIDRegistry(didRegistryAddr);
        auditLogger = IAuditLogger(auditLoggerAddr);
    }

    /// @notice Mint a new asset bound to `did` (the recipient's identity
    /// address). Gated by CORE_ACCESS_CALL, matching ARCHITECTURE.md
    /// Section 6 step 3: caller and recipient are checked/bound separately
    /// (an Admin mints TO a student's DID — they are not the same party).
    /// @param orgId Tenant scope this mint happens under.
    /// @param callerDid Identity address of whoever is invoking the mint (checked for CREATE on NFT).
    ///        Must be controlled by msg.sender — verified via DIDRegistry.identityOwner(),
    ///        not just taken on faith (docs/SECURITY.md Section 3.1).
    /// @param did Identity address the minted asset is bound to (the recipient).
    /// @param metadataHash IPFS hash/CID of the metadata JSON (hash only — no raw metadata on-chain).
    function mintTo(
        bytes32 orgId,
        address callerDid,
        address did,
        string calldata metadataHash
    ) external returns (uint256 tokenId) {
        if (did == address(0)) {
            revert ZeroRecipientDid();
        }

        if (!didRegistry.isActive(did)) {
            revert InactiveRecipientDid();
        }

        if (msg.sender != didRegistry.identityOwner(callerDid)) {
            revert NotCallerDidOwner();
        }

        if (!policyEngine.checkAccess(orgId, callerDid, RESOURCE_TYPE_NFT, ACTION_CREATE)) {
            revert AccessDenied();
        }

        tokenId = _nextTokenId++;
        tokenOrgId[tokenId] = orgId;
        _metadataHash[tokenId] = metadataHash;

        _safeMint(did, tokenId);

        if (address(auditLogger) != address(0)) {
            auditLogger.logEvent(orgId, "ASSET_MINTED", did, abi.encode(tokenId, metadataHash));
            auditLogger.logTypedEvent(
                orgId,
                AUDIT_ACTION_ASSET_MINTED,
                RESOURCE_TYPE_NFT,
                bytes32(tokenId),
                did,
                true,
                abi.encode(metadataHash)
            );
        }

        emit AssetMinted(tokenId, did, orgId, metadataHash, msg.sender);
    }

    /// @notice The only way an asset moves between DIDs. Standard ERC-721
    /// transferFrom/safeTransferFrom are disabled below — routing every
    /// transfer through checkAccess is what makes RBAC enforcement mean
    /// something for asset ownership specifically, not just NFT minting.
    function transferWithAccessCheck(
        bytes32 orgId,
        address callerDid,
        address toDid,
        uint256 tokenId
    ) external {
        // `_update` treats address(0) as a burn. This contract deliberately
        // exposes no burn flow, so reject it rather than allowing a transfer
        // request to permanently destroy an asset.
        if (toDid == address(0)) {
            revert ZeroRecipientDid();
        }

        if (!didRegistry.isActive(toDid)) {
            revert InactiveRecipientDid();
        }

        if (msg.sender != didRegistry.identityOwner(callerDid)) {
            revert NotCallerDidOwner();
        }

        if (tokenOrgId[tokenId] != orgId) {
            revert WrongOrg();
        }

        if (!policyEngine.checkAccess(orgId, callerDid, RESOURCE_TYPE_NFT, ACTION_TRANSFER)) {
            revert AccessDenied();
        }

        address from = _requireOwned(tokenId);
        _update(toDid, tokenId, from);

        if (address(auditLogger) != address(0)) {
            auditLogger.logEvent(orgId, "ASSET_TRANSFERRED", toDid, abi.encode(tokenId, from));
            auditLogger.logTypedEvent(
                orgId,
                AUDIT_ACTION_ASSET_TRANSFERRED,
                RESOURCE_TYPE_NFT,
                bytes32(tokenId),
                toDid,
                true,
                abi.encode(from)
            );
        }

        emit AssetTransferred(tokenId, from, toDid);
    }

    /// @notice ipfs://<hash> — the metadata content itself lives on IPFS;
    /// only the hash is ever written on-chain.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string(abi.encodePacked("ipfs://", _metadataHash[tokenId]));
    }

    function metadataHashOf(uint256 tokenId) external view returns (string memory) {
        _requireOwned(tokenId);
        return _metadataHash[tokenId];
    }

    /// @notice Consolidated indexer/console read. It is read-only and leaves
    /// the current org-scoped, policy-gated transfer model unchanged.
    function getAsset(uint256 tokenId)
        external
        view
        returns (bytes32 orgId, string memory metadataHash, address owner)
    {
        owner = _requireOwned(tokenId);
        return (tokenOrgId[tokenId], _metadataHash[tokenId], owner);
    }

    function assetExists(uint256 tokenId) external view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    // --- Lock down raw ERC-721 transfer paths -------------------------------
    // A plain approve()+transferFrom() would bypass checkAccess entirely.
    // transferWithAccessCheck() above is the sole transfer path.

    function transferFrom(address, address, uint256) public pure override {
        revert("AssetNFT: use transferWithAccessCheck");
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert("AssetNFT: use transferWithAccessCheck");
    }
}
