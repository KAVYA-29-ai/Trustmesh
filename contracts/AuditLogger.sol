// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * AuditLogger.sol — CONTRACT_AUDIT
 * ==================================
 * Event-based, never storage-based (STATUS.md Section 2, Locked Decision —
 * ~375 gas/event vs 20,000+ gas/write). The only thing this contract keeps
 * in storage is the small emitter allow-list below; that's access-control
 * state, not audit data, so it doesn't violate that decision.
 *
 * WHY AN ALLOW-LIST AT ALL:
 * logEvent() takes caller-supplied `orgId`, `eventType`, and `subjectDid`
 * with no way to independently verify them. If any address could call it,
 * anyone could emit a fake "AuditEvent" claiming some other org's admin
 * did something they didn't — which would quietly break the "tamper-proof,
 * independently verifiable" pitch (ARCHITECTURE.md Section 11) the moment
 * someone actually queries the log. Restricting logEvent() to explicitly
 * authorized resource contracts (AssetNFT, and others as they're built)
 * is what makes the emitted `emitter` address in AuditEvent meaningful.
 *
 * INTERFACE NOTE: matches the IAuditLogger interface AssetNFT.sol already
 * calls (logEvent(bytes32 orgId, string eventType, address subjectDid,
 * bytes data)) — no changes needed on that side.
 *
 * NOT WIRED UP YET: PolicyEngine.sol emits its own events directly and
 * does not call into this contract — see the note in chat. The off-chain
 * indexer (3.4's next sub-item) needs to account for that split until/
 * unless that's revisited.
 */
contract AuditLogger {
    address public admin; // should be the same superAdmin/multisig as PolicyEngine — see STATUS.md 3.2's deferred multisig item; unrelated to this contract's own logic either way

    mapping(address => bool) public authorizedEmitters;

    event EmitterAuthorized(address indexed emitter, bool authorized, address indexed by);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    /// @notice The single audit event shape every authorized contract emits
    /// through. `eventType` (e.g. "ASSET_MINTED", "ASSET_TRANSFERRED") and
    /// `data` (abi-encoded, event-specific payload) keep this generic so
    /// new emitters/event types never require changing this contract's ABI.
    event AuditEvent(
        bytes32 indexed orgId,
        address indexed emitter,
        string eventType,
        address indexed subjectDid,
        bytes data,
        uint256 timestamp
    );

    /// @notice Machine-friendly companion to AuditEvent. It retains tenant
    /// scope and emitter provenance while avoiding string parsing by indexers.
    event TypedAuditEvent(
        bytes32 indexed orgId,
        address indexed emitter,
        bytes32 indexed action,
        bytes32 resourceType,
        bytes32 resourceId,
        address subjectDid,
        bool success,
        bytes data,
        uint256 timestamp
    );

    error OnlyAdmin();
    error NotAuthorizedEmitter();
    error ZeroAddress();
    error EmitterMustBeContract();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }

    constructor(address _admin) {
        if (_admin == address(0)) revert ZeroAddress();
        admin = _admin;
    }

    /// @notice Authorize or revoke a contract's ability to call logEvent().
    /// Called once per resource contract at deploy time (e.g. AssetNFT),
    /// and again whenever a new resource contract is added to the system.
    function setEmitterAuthorized(address emitter, bool authorized) external onlyAdmin {
        if (emitter == address(0)) revert ZeroAddress();
        if (authorized && emitter.code.length == 0) revert EmitterMustBeContract();
        authorizedEmitters[emitter] = authorized;
        emit EmitterAuthorized(emitter, authorized, msg.sender);
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        emit AdminTransferred(admin, newAdmin);
        admin = newAdmin;
    }

    /// @notice CORE_ACCESS_CALL's audit-side counterpart — the one function
    /// every resource contract routes its audit trail through, exactly as
    /// everything routes access checks through PolicyEngine.checkAccess().
    function logEvent(
        bytes32 orgId,
        string calldata eventType,
        address subjectDid,
        bytes calldata data
    ) external {
        if (!authorizedEmitters[msg.sender]) revert NotAuthorizedEmitter();
        emit AuditEvent(orgId, msg.sender, eventType, subjectDid, data, block.timestamp);
    }

    function logTypedEvent(
        bytes32 orgId,
        bytes32 action,
        bytes32 resourceType,
        bytes32 resourceId,
        address subjectDid,
        bool success,
        bytes calldata data
    ) external {
        if (!authorizedEmitters[msg.sender]) revert NotAuthorizedEmitter();
        require(action != bytes32(0), "ZERO_ACTION");

        emit TypedAuditEvent(
            orgId,
            msg.sender,
            action,
            resourceType,
            resourceId,
            subjectDid,
            success,
            data,
            block.timestamp
        );
    }
}
