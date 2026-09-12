// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * RecoveryModule.sol — CONTRACT_RECOVERY ("The Sentinel Protocol")
 * ====================================================================
 * STATUS: STUBBED. NOT YET IMPLEMENTED. Build priority is on 3.1–3.10
 * first — see STATUS.md Section 3, item 3.12. This file exists purely
 * so the shape of the feature is on record and doesn't get re-derived
 * from scratch later, and so the one required DIDRegistry.sol change
 * is written down NOW rather than discovered mid-implementation.
 *
 * Full design/rationale: ARCHITECTURE.md Section 8 ("The Sentinel
 * Protocol"). This file mirrors that section's data model 1:1.
 *
 * --------------------------------------------------------------------
 * REQUIRED CHANGE TO DIDRegistry.sol WHEN THIS IS BUILT (NOT applied yet):
 * --------------------------------------------------------------------
 * Vanilla ERC-1056's changeOwner() only accepts a call, or a signature,
 * from the CURRENT owner. A user who lost their key cannot produce
 * that signature — which is exactly the scenario this module exists
 * for. So DIDRegistry.sol will need exactly one new permissioned
 * function, added in the same PR that implements this module:
 *
 *     address public recoveryModule; // set once, immutable, at deploy
 *
 *     function recoverOwnership(address identity, address newOwner) external {
 *         require(msg.sender == recoveryModule, "ONLY_RECOVERY_MODULE");
 *         owners[identity] = newOwner;
 *         emit DIDOwnerChanged(identity, newOwner, changed[identity]);
 *         changed[identity] = block.number;
 *     }
 *
 * Nothing else in DIDRegistry.sol changes. Keeping this out of
 * DIDRegistry.sol until then keeps that fork trivially diff-able
 * against upstream ERC-1056 in the meantime.
 * --------------------------------------------------------------------
 * OPEN QUESTION THIS FILE IS BLOCKED ON (STATUS.md Section 4):
 * Is an institutional guardian its own DID, a multisig address, or a
 * plain EOA signer? The `institutionalGuardians` mapping below assumes
 * "plain address" as the simplest starting point — revisit before
 * writing the real approve/finalize logic.
 * --------------------------------------------------------------------
 */
contract RecoveryModule {
    // ================================================================
    // Data model — ARCHITECTURE.md Section 8.3, unchanged
    // ================================================================

    struct RecoveryPolicy {
        bytes32 orgId;
        uint8   peerThreshold;          // M in M-of-N peer guardians
        uint8   peerGuardianCount;      // N
        uint8   institutionalThreshold; // K required institutional sign-offs; 0 = individual users, not required
        uint256 timelockSeconds;        // e.g. 259200 for 72h
    }

    // TODO: an in-flight recovery needs its own struct once approve/finalize
    // logic is written — proposed new owner, per-attempt peer signature
    // count, per-attempt institutional signature count (tracked SEPARATELY,
    // since 8.2 requires an AND between the two groups, not a merged
    // count), timelock start timestamp, and finalized/cancelled state.
    //
    // struct RecoveryAttempt {
    //     address proposedNewOwner;
    //     uint8   peerApprovals;
    //     uint8   institutionalApprovals;
    //     uint256 timelockEnd;
    //     bool    finalized;
    //     bool    cancelled;
    // }

    // did (address) => that identity's recovery policy
    mapping(address => RecoveryPolicy) public recoveryPolicies;

    // did => guardian address => is a nominated peer guardian?
    mapping(address => mapping(address => bool)) public peerGuardians;

    // did => institutional guardian address => is an institutional guardian?
    mapping(address => mapping(address => bool)) public institutionalGuardians;

    // did => active RecoveryAttempt (once the struct above exists)
    // mapping(address => RecoveryAttempt) public activeRecovery;

    address public didRegistry; // set at deploy — the DIDRegistry.sol to call recoverOwnership() on

    // ================================================================
    // Events — every transition must emit. 8.2: "recovery can never
    // happen quietly."
    // ================================================================

    event RecoveryInitiated(address indexed identity, address proposedNewOwner, uint256 timelockEnd);
    event RecoveryApproved(address indexed identity, address indexed guardian, bool isInstitutional);
    event RecoveryFinalized(address indexed identity, address newOwner);
    event RecoveryCancelled(address indexed identity, address indexed cancelledBy);

    constructor(address _didRegistry) {
        didRegistry = _didRegistry;
    }

    // ================================================================
    // Guardian setup — "3–5 nominated guardians at DID creation" (8.2)
    // ================================================================

    function nominatePeerGuardians(address, address[] calldata) external pure {
        revert("NOT_IMPLEMENTED_YET");
        // Planned: only identity's current owner may call; enforce
        // 3 <= guardians.length <= 5 per ARCHITECTURE.md 8.2; write to
        // peerGuardians[identity][...] for each address.
    }

    function nominateInstitutionalGuardians(address, address[] calldata) external pure {
        revert("NOT_IMPLEMENTED_YET");
        // Only relevant for Tier 2 (organizational identities) — see 8.2.
    }

    function setRecoveryPolicy(bytes32, address, RecoveryPolicy calldata) external pure {
        revert("NOT_IMPLEMENTED_YET");
        // Planned: org admins set stricter policy for privileged roles via
        // ADMIN_CONSOLE_NAME (8.3) — e.g. institutionalThreshold=2 for
        // Admin/Manager roles, so no single institutional signer can
        // unilaterally approve a privileged-account recovery.
    }

    // ================================================================
    // Recovery flow — ARCHITECTURE.md Section 8.2
    // ================================================================

    function initiateRecovery(address, address) external pure {
        revert("NOT_IMPLEMENTED_YET");
        // Planned: callable by anyone (a locked-out user can't sign as
        // themselves) but only creates a PENDING attempt — no state change
        // until thresholds are met. Emits RecoveryInitiated.
    }

    function approveRecovery(address) external pure {
        revert("NOT_IMPLEMENTED_YET");
        // Planned: msg.sender must be a peerGuardian or institutionalGuardian
        // for `identity`. Increment the matching counter on the active
        // attempt. Once BOTH thresholds are independently met
        // (peerApprovals >= peerThreshold AND institutionalApprovals >=
        // institutionalThreshold), start the timelock — the AND is the
        // entire point of Tier 2, do not collapse it into a single count.
        // Emits RecoveryApproved(identity, msg.sender, isInstitutional).
    }

    function finalizeRecovery(address) external pure {
        revert("NOT_IMPLEMENTED_YET");
        // Planned: require block.timestamp >= activeRecovery[identity].timelockEnd
        // and !cancelled, then call
        // DIDRegistry(didRegistry).recoverOwnership(identity, proposedNewOwner).
        // Emits RecoveryFinalized.
    }

    function cancelRecovery(address) external pure {
        revert("NOT_IMPLEMENTED_YET");
        // Planned: callable by the identity's current owner (the "visible
        // cancellation window" from 8.2 — if the real owner still controls
        // their key and sees an unexpected recovery attempt, they can kill
        // it during the timelock). Emits RecoveryCancelled.
    }
}
