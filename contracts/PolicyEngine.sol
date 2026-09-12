// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * PolicyEngine.sol — CONTRACT_POLICY
 * ====================================
 * Generic Resource / Role / Permission engine, scoped by orgId.
 * Design reference: ARCHITECTURE.md Section 4.1.
 *
 * CHANGES FROM THE ORIGINAL ARCHITECTURE.md SNIPPET (flagged, not silent):
 *
 *  1. `did` is typed `address`, not `bytes32` — matches did:ethr, where
 *     the DID identifier IS the Ethereum address (see DIDRegistry.sol).
 *
 *  2. Access control added to every write path. The original snippet only
 *     ever showed checkAccess() (the read path) — it never specified who
 *     may call assignRole/setRolePermission. As first written, those were
 *     open to anyone, which meant anyone could self-grant Admin on any
 *     org. Closed via a superAdmin bootstrap + org-scoped Admin role;
 *     see the access model below.
 *
 *  3. roleId == bytes32(0) is rejected everywhere it could be set as a
 *     permission target. bytes32(0) is the mapping's default "no role
 *     assigned" value — allowing permissions to be defined for it would
 *     silently grant that permission to every DID with no role at all.
 *     This was a latent hole in the original data model, not a feature
 *     request; closed without asking since it's a correctness issue,
 *     not a design choice.
 *
 *  4. Resource/Permission structs are now backed by real storage and
 *     Admin-gated write functions, not just declared-and-unused. They
 *     remain METADATA for the no-code console (ADMIN_CONSOLE_NAME) to
 *     enumerate what exists — checkAccess() still only ever consults
 *     rolePermissions, exactly as in ARCHITECTURE.md. Resource/Permission
 *     registration does not itself grant or restrict anything.
 *
 *  5. An emergency pause switch was added, gated to superAdmin, covering
 *     write functions only (checkAccess/reads always stay live). This
 *     maps to two things already in your own docs: STATUS.md's risk
 *     table ("role-based rate limiting" under Admin key compromise) and
 *     Security Center's planned "Emergency pause / multisig status
 *     panel" (3.9) — implemented here at the contract level so that
 *     panel has something real to control.
 *
 *  6. FIX (docs/SECURITY.md Section 3.3): `checkAccess()` always derives
 *     the permission key itself as `keccak256(abi.encodePacked(action,
 *     resourceId))`, but `setRolePermission()` used to accept an
 *     arbitrary caller-chosen `permissionId` — the same free-form ID
 *     format `definePermission()`'s registry uses (e.g.
 *     `keccak256("MINT:NFT")`). Those two formats don't collide by
 *     construction, so a role-permission grant made against a
 *     registry-style `permissionId` would silently never match what
 *     `checkAccess()` computes at read time — "access denied" that
 *     looks like a bug, not a config mistake. Fixed by having
 *     `setRolePermission()` take `(action, resourceId)` directly and
 *     derive the key internally, so it's now structurally impossible
 *     for the grant format and the check format to diverge. The
 *     Resource/Permission registry (`definePermission`,
 *     `attachPermissionToResource`) is unchanged and stays free-form —
 *     it was already documented as console-display metadata that
 *     doesn't feed `checkAccess()`, so it isn't part of this mismatch.
 *     A `computePermissionId()` helper is exposed so the console/indexer
 *     can derive the same id for display without re-implementing the
 *     encoding.
 *
 *  7. FIX (docs/SECURITY.md Section 3.8): `revokeRole()` was gated by
 *     `onlyOrgAdmin` alone, with no check on what role the *target*
 *     held — unlike `assignRole()`, which explicitly requires
 *     `msg.sender == superAdmin` before it will grant `ADMIN_ROLE`.
 *     That asymmetry meant any org Admin could call
 *     `revokeRole(orgId, otherAdminDid)` and strip a peer Admin's role
 *     (including their own super-admin-granted access) with zero
 *     superAdmin involvement — one compromised Admin key could de-admin
 *     every other Admin in the org. Fixed by adding the same
 *     "only superAdmin touches ADMIN_ROLE" gate to the revoke path:
 *     `revokeRole()` now checks the *current* role of `did` and
 *     requires `msg.sender == superAdmin` whenever that role is
 *     `ADMIN_ROLE`, exactly mirroring `assignRole()`'s guard. Revoking
 *     any non-Admin role is unaffected — org Admins keep that ability
 *     as before.
 *
 * ACCESS MODEL SUMMARY:
 *   superAdmin        — global, set at deploy (should be a multisig).
 *                        Registers orgs, sets/changes each org's ADMIN_ROLE
 *                        holders, can pause/unpause, can transfer itself.
 *   ADMIN_ROLE (per org) — assigns MANAGER_ROLE/AUDITOR_ROLE/USER_ROLE (or
 *                        custom roles) within their org; defines
 *                        resources, permissions, and role-permission
 *                        grants within their org. Cannot grant ADMIN_ROLE
 *                        or SUPER_ADMIN_ROLE to anyone — only superAdmin
 *                        can do that, matching the hierarchy diagram's
 *                        arrows in ARCHITECTURE.md Section 3.
 */
contract PolicyEngine {
    // ================================================================
    // Role constants — shared bytes32 IDs, always used together with an
    // orgId in storage, so the same constant naturally stays isolated
    // per organization.
    // ================================================================

    bytes32 public constant SUPER_ADMIN_ROLE = keccak256("SUPER_ADMIN_ROLE");
    bytes32 public constant ADMIN_ROLE       = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE     = keccak256("MANAGER_ROLE");
    bytes32 public constant AUDITOR_ROLE     = keccak256("AUDITOR_ROLE");
    bytes32 public constant USER_ROLE        = keccak256("USER_ROLE");

    // ================================================================
    // Data model — ARCHITECTURE.md Section 4.1
    // ================================================================

    struct Resource {
        bytes32 resourceId;       // keccak256("nft:1234") | keccak256("api:/reports") | keccak256("door:4B")
        string  resourceType;     // "NFT" | "API" | "DOCUMENT" | "PHYSICAL" | "CUSTOM"
        address resourceContract; // optional external contract this resource lives in
        bool    exists;           // distinguishes "registered, empty fields" from "never registered"
    }

    struct Permission {
        bytes32 permissionId;     // keccak256("MINT:NFT") | keccak256("READ:DOCUMENT")
        string  action;           // "CREATE" | "READ" | "UPDATE" | "DELETE" | "TRANSFER" | "APPROVE" | custom
        string  resourceType;
        bool    exists;
    }

    // orgId => resourceId => permissionIds attached to that resource (console metadata only)
    mapping(bytes32 => mapping(bytes32 => bytes32[])) public resourcePolicies;

    // orgId => resourceId => Resource
    mapping(bytes32 => mapping(bytes32 => Resource)) public resources;

    // orgId => permissionId => Permission
    mapping(bytes32 => mapping(bytes32 => Permission)) public permissionRegistry;

    // orgId => did (address) => roleId
    mapping(bytes32 => mapping(address => bytes32)) public roleAssignments;

    // orgId => roleId => permissionId => granted?
    mapping(bytes32 => mapping(bytes32 => mapping(bytes32 => bool))) public rolePermissions;

    // ================================================================
    // Access control state
    // ================================================================

    address public superAdmin;
    mapping(bytes32 => bool) public orgRegistered;
    bool public paused;

    // ================================================================
    // Events — every state change emits, per your audit-via-events rule
    // ================================================================

    event OrgRegistered(bytes32 indexed orgId, address indexed initialAdmin);
    event RoleAssigned(bytes32 indexed orgId, address indexed did, bytes32 roleId, address indexed grantedBy);
    event RolePermissionSet(bytes32 indexed orgId, bytes32 indexed roleId, bytes32 permissionId, bool granted);
    event ResourceRegistered(bytes32 indexed orgId, bytes32 indexed resourceId, string resourceType, address resourceContract);
    event PermissionDefined(bytes32 indexed orgId, bytes32 indexed permissionId, string action, string resourceType);
    event PermissionAttachedToResource(bytes32 indexed orgId, bytes32 indexed resourceId, bytes32 permissionId);
    event SuperAdminTransferred(address indexed previousSuperAdmin, address indexed newSuperAdmin);
    event Paused(address indexed by);
    event Unpaused(address indexed by);

    // ================================================================
    // Modifiers
    // ================================================================

    modifier onlySuperAdmin() {
        require(msg.sender == superAdmin, "ONLY_SUPER_ADMIN");
        _;
    }

    modifier onlyOrgAdmin(bytes32 orgId) {
        require(
            msg.sender == superAdmin || roleAssignments[orgId][msg.sender] == ADMIN_ROLE,
            "ONLY_ORG_ADMIN"
        );
        _;
    }

    modifier orgExists(bytes32 orgId) {
        require(orgRegistered[orgId], "ORG_NOT_REGISTERED");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "PAUSED");
        _;
    }

    constructor(address _superAdmin) {
        require(_superAdmin != address(0), "ZERO_SUPER_ADMIN");
        superAdmin = _superAdmin;
    }

    // ================================================================
    // CORE_ACCESS_CALL — the one function everything routes through.
    // Deliberately has NO access-control modifier and is unaffected by
    // pause: every gated resource in the system depends on this being
    // callable at all times.
    // ================================================================

    function checkAccess(
        bytes32 orgId,
        address did,
        bytes32 resourceId,
        string calldata action
    ) external view returns (bool) {
        bytes32 roleId = roleAssignments[orgId][did];
        if (roleId == bytes32(0)) return false;
        bytes32 permId = computePermissionId(action, resourceId);
        return rolePermissions[orgId][roleId][permId];
    }

    /// @notice The exact key `checkAccess()` looks up under
    /// `rolePermissions`. Exposed as `public pure` so `setRolePermission()`
    /// can share it (see fix #6 above) and so off-chain callers
    /// (ADMIN_CONSOLE_NAME's PolicyBuilder, the indexer) can derive the
    /// identical id for display without re-implementing the encoding and
    /// risking drift.
    function computePermissionId(string calldata action, bytes32 resourceId) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(action, resourceId));
    }

    // ================================================================
    // Org bootstrap — superAdmin only
    // ================================================================

    function registerOrg(bytes32 orgId, address initialAdmin) external onlySuperAdmin whenNotPaused {
        require(orgId != bytes32(0), "INVALID_ORG_ID");
        require(!orgRegistered[orgId], "ORG_ALREADY_REGISTERED");
        require(initialAdmin != address(0), "ZERO_ADMIN");

        orgRegistered[orgId] = true;
        roleAssignments[orgId][initialAdmin] = ADMIN_ROLE;

        emit OrgRegistered(orgId, initialAdmin);
        emit RoleAssigned(orgId, initialAdmin, ADMIN_ROLE, msg.sender);
    }

    function transferSuperAdmin(address newSuperAdmin) external onlySuperAdmin whenNotPaused {
        require(newSuperAdmin != address(0), "ZERO_SUPER_ADMIN");
        emit SuperAdminTransferred(superAdmin, newSuperAdmin);
        superAdmin = newSuperAdmin;
    }

    function pause() external onlySuperAdmin {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlySuperAdmin {
        paused = false;
        emit Unpaused(msg.sender);
    }

    // ================================================================
    // Role assignment
    // ================================================================

    /// @notice Assigns a role to a DID within an org.
    /// Org Admins may assign MANAGER_ROLE, AUDITOR_ROLE, USER_ROLE, or
    /// any custom (non-reserved) roleId. Only superAdmin may assign or
    /// change ADMIN_ROLE — matches the hierarchy diagram, where ADMIN
    /// grants downward to Manager/Auditor/User but Super Admin is the
    /// only one who "sets first Admin."
    function assignRole(bytes32 orgId, address did, bytes32 roleId) external whenNotPaused orgExists(orgId) {
        require(did != address(0), "ZERO_DID");
        require(roleId != bytes32(0), "INVALID_ROLE");
        require(roleId != SUPER_ADMIN_ROLE, "SUPER_ADMIN_NOT_ORG_SCOPED");

        if (roleId == ADMIN_ROLE) {
            require(msg.sender == superAdmin, "ONLY_SUPER_ADMIN_SETS_ADMIN");
        } else {
            require(
                msg.sender == superAdmin || roleAssignments[orgId][msg.sender] == ADMIN_ROLE,
                "ONLY_ORG_ADMIN"
            );
        }

        roleAssignments[orgId][did] = roleId;
        emit RoleAssigned(orgId, did, roleId, msg.sender);
    }

    /// @notice Convenience wrapper — revokes any role by resetting to
    /// the default "no role" value. Equivalent to assignRole(orgId, did,
    /// bytes32(0)) but avoids callers having to know that convention.
    /// @dev FIX (see changelog #7): mirrors assignRole()'s guard — only
    /// superAdmin may revoke ADMIN_ROLE. Without this, `onlyOrgAdmin`
    /// let any Admin strip any other Admin's role, bypassing the exact
    /// safeguard assignRole() builds for granting it.
    function revokeRole(bytes32 orgId, address did) external whenNotPaused orgExists(orgId) onlyOrgAdmin(orgId) {
        if (roleAssignments[orgId][did] == ADMIN_ROLE) {
            require(msg.sender == superAdmin, "ONLY_SUPER_ADMIN_REVOKES_ADMIN");
        }
        roleAssignments[orgId][did] = bytes32(0);
        emit RoleAssigned(orgId, did, bytes32(0), msg.sender);
    }

    // ================================================================
    // Role-permission grants
    // ================================================================

    /// @notice Grants or revokes `roleId`'s permission to perform `action`
    /// on `resourceId`. Takes `(action, resourceId)` rather than a raw
    /// `permissionId` — see fix #6 above — so the stored key is always
    /// exactly what `checkAccess()` will look up; there's no longer a way
    /// to grant a permission under a key `checkAccess()` can never match.
    function setRolePermission(
        bytes32 orgId,
        bytes32 roleId,
        string calldata action,
        bytes32 resourceId,
        bool granted
    ) external whenNotPaused orgExists(orgId) onlyOrgAdmin(orgId) {
        require(roleId != bytes32(0), "INVALID_ROLE");
        bytes32 permissionId = computePermissionId(action, resourceId);
        rolePermissions[orgId][roleId][permissionId] = granted;
        emit RolePermissionSet(orgId, roleId, permissionId, granted);
    }

    // ================================================================
    // Resource / Permission registry — console metadata, not enforcement
    // ================================================================

    function registerResource(
        bytes32 orgId,
        bytes32 resourceId,
        string calldata resourceType,
        address resourceContract
    ) external whenNotPaused orgExists(orgId) onlyOrgAdmin(orgId) {
        require(resourceId != bytes32(0), "INVALID_RESOURCE_ID");
        require(!resources[orgId][resourceId].exists, "RESOURCE_ALREADY_REGISTERED");

        resources[orgId][resourceId] = Resource({
            resourceId: resourceId,
            resourceType: resourceType,
            resourceContract: resourceContract,
            exists: true
        });

        emit ResourceRegistered(orgId, resourceId, resourceType, resourceContract);
    }

    function definePermission(
        bytes32 orgId,
        bytes32 permissionId,
        string calldata action,
        string calldata resourceType
    ) external whenNotPaused orgExists(orgId) onlyOrgAdmin(orgId) {
        require(permissionId != bytes32(0), "INVALID_PERMISSION_ID");
        require(!permissionRegistry[orgId][permissionId].exists, "PERMISSION_ALREADY_DEFINED");

        permissionRegistry[orgId][permissionId] = Permission({
            permissionId: permissionId,
            action: action,
            resourceType: resourceType,
            exists: true
        });

        emit PermissionDefined(orgId, permissionId, action, resourceType);
    }

    /// @notice Records that a permission is relevant to a resource, for
    /// the no-code console to display. Purely informational — does NOT
    /// affect checkAccess(), which only ever reads rolePermissions.
    function attachPermissionToResource(
        bytes32 orgId,
        bytes32 resourceId,
        bytes32 permissionId
    ) external whenNotPaused orgExists(orgId) onlyOrgAdmin(orgId) {
        require(resources[orgId][resourceId].exists, "RESOURCE_NOT_REGISTERED");
        require(permissionRegistry[orgId][permissionId].exists, "PERMISSION_NOT_DEFINED");

        resourcePolicies[orgId][resourceId].push(permissionId);
        emit PermissionAttachedToResource(orgId, resourceId, permissionId);
    }

    function getResourcePermissions(bytes32 orgId, bytes32 resourceId) external view returns (bytes32[] memory) {
        return resourcePolicies[orgId][resourceId];
    }
}

/**
 * Usage example (matches ARCHITECTURE.md Section 4.1's mintAsset snippet,
 * with the address-typed did — resource contracts call checkAccess exactly
 * as before, nothing here changes their integration):
 *
 *   function mintAsset(address did, string memory metadataURI) external {
 *       require(
 *           policyEngine.checkAccess(orgId, did, RESOURCE_TYPE_NFT, "CREATE"),
 *           "ACCESS_DENIED"
 *       );
 *       _mint(did, metadataURI);
 *   }
 */
