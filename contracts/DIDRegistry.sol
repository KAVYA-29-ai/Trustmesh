// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * DIDRegistry.sol — CONTRACT_DID
 * ================================
 * FORKED, NOT MODIFIED (yet) from the ERC-1056 reference implementation
 * (EthereumDIDRegistry.sol — https://github.com/uport-project/ethr-did-registry,
 * MIT License). Logic is deliberately untouched; only the pragma target was
 * updated to match this project's Solidity 0.8.28 baseline and the contract
 * was renamed to match STATUS.md's CONTRACT_DID variable.
 *
 * DO NOT add the guardian-recovery hook here yet. The one change this file
 * will eventually need (a permissioned `recoverOwnership()` entry point for
 * the Sentinel Protocol) is written down in RecoveryModule.sol as a TODO —
 * apply it there, in the same PR that implements recovery, not now.
 *
 * Before any real deployment, diff this file against the current upstream
 * contract to confirm nothing has drifted since this port was written.
 *
 * Identity model: any Ethereum address is already a valid identity with no
 * registration step (`identityOwner(addr)` returns `addr` itself until an
 * explicit owner change occurs). This is what makes `did:ethr:0x...`
 * free to create — see ARCHITECTURE.md Section 6, step 1.
 */
contract DIDRegistry {
    mapping(address => address) public owners;
    mapping(address => mapping(bytes32 => mapping(address => uint256))) public delegates;
    mapping(address => uint256) public changed;
    mapping(address => uint256) public nonce;

    // ERC-1056 identities remain implicit: every non-zero address starts
    // active. Only an identity's current controller can permanently revoke it.
    mapping(address => bool) public revoked;
    mapping(address => string) private _documentReferences;

    modifier onlyOwner(address identity, address actor) {
        require(actor == identityOwner(identity), "NOT_IDENTITY_OWNER");
        _;
    }

    event DIDOwnerChanged(
        address indexed identity,
        address owner,
        uint256 previousChange
    );

    event DIDDelegateChanged(
        address indexed identity,
        bytes32 delegateType,
        address delegate,
        uint256 validTo,
        uint256 previousChange
    );

    event DIDAttributeChanged(
        address indexed identity,
        bytes32 name,
        bytes value,
        uint256 validTo,
        uint256 previousChange
    );

    event DIDDocumentReferenceChanged(
        address indexed identity,
        string documentReference,
        uint256 previousChange
    );

    event DIDRevoked(address indexed identity, uint256 previousChange);

    /// @notice Resolves the current controller of a DID. Defaults to the
    /// identity address itself until an explicit changeOwner() occurs.
    function identityOwner(address identity) public view returns (address) {
        address owner = owners[identity];
        if (owner != address(0)) {
            return owner;
        }
        return identity;
    }

    /// @notice Every non-zero ERC-1056 identity is active until its current
    /// controller revokes it. This preserves the no-registration model.
    function isActive(address identity) public view returns (bool) {
        return identity != address(0) && !revoked[identity];
    }

    function documentReference(address identity) external view returns (string memory) {
        return _documentReferences[identity];
    }

    function checkSignature(
        address identity,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        bytes32 hash
    ) internal returns (address) {
        address signer = ecrecover(hash, sigV, sigR, sigS);
        require(signer == identityOwner(identity), "BAD_SIGNATURE");
        nonce[signer]++;
        return signer;
    }

    // ============================================================
    // Ownership / key rotation (3.1 "Key rotation without changing
    // the DID itself" — solved by this section, unmodified)
    // ============================================================

    function changeOwner(address identity, address newOwner) public onlyOwner(identity, msg.sender) {
        _changeOwner(identity, newOwner);
    }

    /// @dev Meta-tx variant — lets a relayer submit the rotation on behalf
    /// of the owner, who only needs to sign, not pay gas directly.
    function changeOwnerSigned(
        address identity,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        address newOwner
    ) public {
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0x19), bytes1(0), address(this),
                nonce[identityOwner(identity)], identity, "changeOwner", newOwner
            )
        );
        checkSignature(identity, sigV, sigR, sigS, hash);
        _changeOwner(identity, newOwner);
    }

    function _changeOwner(address identity, address newOwner) internal {
        owners[identity] = newOwner;
        emit DIDOwnerChanged(identity, newOwner, changed[identity]);
        changed[identity] = block.number;
    }

    /// @notice Stores an optional IPFS URI/CID for the DID document.
    function setDocumentReference(address identity, string calldata documentUri)
        external
        onlyOwner(identity, msg.sender)
    {
        require(isActive(identity), "DID_REVOKED");
        require(bytes(documentUri).length != 0, "EMPTY_DOCUMENT_REFERENCE");

        _documentReferences[identity] = documentUri;
        emit DIDDocumentReferenceChanged(identity, documentUri, changed[identity]);
        changed[identity] = block.number;
    }

    /// @notice Permanently deactivates an identity without deleting its
    /// historical ERC-1056 events or document reference.
    function revokeDID(address identity) external onlyOwner(identity, msg.sender) {
        require(identity != address(0), "ZERO_IDENTITY");
        require(!revoked[identity], "DID_ALREADY_REVOKED");

        revoked[identity] = true;
        emit DIDRevoked(identity, changed[identity]);
        changed[identity] = block.number;
    }

    // ============================================================
    // Delegates — time-boxed third-party signers acting on behalf
    // of an identity (e.g. a session key, a service backend)
    // ============================================================

    function validDelegate(address identity, bytes32 delegateType, address delegate) public view returns (bool) {
        uint256 validity = delegates[identity][keccak256(abi.encodePacked(delegateType))][delegate];
        return validity > block.timestamp;
    }

    function addDelegate(
        address identity,
        bytes32 delegateType,
        address delegate,
        uint256 validity
    ) public onlyOwner(identity, msg.sender) {
        _addDelegate(identity, delegateType, delegate, validity);
    }

    function addDelegateSigned(
        address identity,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        bytes32 delegateType,
        address delegate,
        uint256 validity
    ) public {
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0x19), bytes1(0), address(this),
                nonce[identityOwner(identity)], identity, "addDelegate",
                delegateType, delegate, validity
            )
        );
        checkSignature(identity, sigV, sigR, sigS, hash);
        _addDelegate(identity, delegateType, delegate, validity);
    }

    function _addDelegate(
        address identity,
        bytes32 delegateType,
        address delegate,
        uint256 validity
    ) internal {
        delegates[identity][keccak256(abi.encodePacked(delegateType))][delegate] = block.timestamp + validity;
        emit DIDDelegateChanged(identity, delegateType, delegate, block.timestamp + validity, changed[identity]);
        changed[identity] = block.number;
    }

    function revokeDelegate(
        address identity,
        bytes32 delegateType,
        address delegate
    ) public onlyOwner(identity, msg.sender) {
        _revokeDelegate(identity, delegateType, delegate);
    }

    function revokeDelegateSigned(
        address identity,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        bytes32 delegateType,
        address delegate
    ) public {
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0x19), bytes1(0), address(this),
                nonce[identityOwner(identity)], identity, "revokeDelegate",
                delegateType, delegate
            )
        );
        checkSignature(identity, sigV, sigR, sigS, hash);
        _revokeDelegate(identity, delegateType, delegate);
    }

    function _revokeDelegate(address identity, bytes32 delegateType, address delegate) internal {
        delegates[identity][keccak256(abi.encodePacked(delegateType))][delegate] = block.timestamp;
        emit DIDDelegateChanged(identity, delegateType, delegate, block.timestamp, changed[identity]);
        changed[identity] = block.number;
    }

    // ============================================================
    // Attributes — off-chain DID Document fields (pubkeys, service
    // endpoints, IPFS pointers) recorded as EVENTS ONLY, never
    // storage. This is what 3.1's "DID Document pinned to IPFS,
    // hash on-chain" step will call.
    // ============================================================

    function setAttribute(
        address identity,
        bytes32 name,
        bytes memory value,
        uint256 validity
    ) public onlyOwner(identity, msg.sender) {
        _setAttribute(identity, name, value, validity);
    }

    function setAttributeSigned(
        address identity,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        bytes32 name,
        bytes memory value,
        uint256 validity
    ) public {
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0x19), bytes1(0), address(this),
                nonce[identityOwner(identity)], identity, "setAttribute",
                name, value, validity
            )
        );
        checkSignature(identity, sigV, sigR, sigS, hash);
        _setAttribute(identity, name, value, validity);
    }

    function _setAttribute(
        address identity,
        bytes32 name,
        bytes memory value,
        uint256 validity
    ) internal {
        emit DIDAttributeChanged(identity, name, value, block.timestamp + validity, changed[identity]);
        changed[identity] = block.number;
    }

    function revokeAttribute(
        address identity,
        bytes32 name,
        bytes memory value
    ) public onlyOwner(identity, msg.sender) {
        _revokeAttribute(identity, name, value);
    }

    function revokeAttributeSigned(
        address identity,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        bytes32 name,
        bytes memory value
    ) public {
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0x19), bytes1(0), address(this),
                nonce[identityOwner(identity)], identity, "revokeAttribute",
                name, value
            )
        );
        checkSignature(identity, sigV, sigR, sigS, hash);
        _revokeAttribute(identity, name, value);
    }

    function _revokeAttribute(address identity, bytes32 name, bytes memory value) internal {
        emit DIDAttributeChanged(identity, name, value, 0, changed[identity]);
        changed[identity] = block.number;
    }
}
