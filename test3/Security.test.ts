import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("TrustMesh Smart Contract Security", function () {
  let didRegistry: any;
  let policyEngine: any;
  let auditLogger: any;
  let assetNFT: any;

  let admin: any;
  let manager: any;
  let user: any;
  let attacker: any;

  let adminAddress: string;
  let managerAddress: string;
  let userAddress: string;
  let attackerAddress: string;

  let didRegistryAddress: string;
  let policyEngineAddress: string;
  let auditLoggerAddress: string;

  const DID = "did:trustmesh:security-user";

  const ADMIN_ROLE = ethers.keccak256(
    ethers.toUtf8Bytes("ADMIN")
  );

  const MANAGER_ROLE = ethers.keccak256(
    ethers.toUtf8Bytes("MANAGER")
  );

  const USER_ROLE = ethers.keccak256(
    ethers.toUtf8Bytes("USER")
  );

  const ASSET_RESOURCE = ethers.keccak256(
    ethers.toUtf8Bytes("ASSET")
  );

  const MINT_ACTION = ethers.keccak256(
    ethers.toUtf8Bytes("MINT")
  );

  const TRANSFER_ACTION = ethers.keccak256(
    ethers.toUtf8Bytes("TRANSFER")
  );

  const DID_HASH = ethers.keccak256(
    ethers.toUtf8Bytes(DID)
  );

  beforeEach(async function () {
    [
      admin,
      manager,
      user,
      attacker
    ] = await ethers.getSigners();

    adminAddress =
      await admin.getAddress();

    managerAddress =
      await manager.getAddress();

    userAddress =
      await user.getAddress();

    attackerAddress =
      await attacker.getAddress();

    // 1. Deploy AuditLogger
    const AuditLogger =
      await ethers.getContractFactory(
        "AuditLogger"
      );

    auditLogger =
      await AuditLogger.deploy();

    await auditLogger.waitForDeployment();

    auditLoggerAddress =
      await auditLogger.getAddress();

    // 2. Deploy DIDRegistry
    const DIDRegistry =
      await ethers.getContractFactory(
        "DIDRegistry"
      );

    didRegistry =
      await DIDRegistry.deploy(
        auditLoggerAddress
      );

    await didRegistry.waitForDeployment();

    didRegistryAddress =
      await didRegistry.getAddress();

    // 3. Deploy PolicyEngine
    const PolicyEngine =
      await ethers.getContractFactory(
        "PolicyEngine"
      );

    policyEngine =
      await PolicyEngine.deploy(
        auditLoggerAddress
      );

    await policyEngine.waitForDeployment();

    policyEngineAddress =
      await policyEngine.getAddress();

    // 4. Deploy AssetNFT
    const AssetNFT =
      await ethers.getContractFactory(
        "AssetNFT"
      );

    assetNFT =
      await AssetNFT.deploy(
        adminAddress,
        didRegistryAddress,
        policyEngineAddress,
        auditLoggerAddress
      );

    await assetNFT.waitForDeployment();

    // 5. Authorize TrustMesh contracts
    await auditLogger.authorizeLogger(
      didRegistryAddress
    );

    await auditLogger.authorizeLogger(
      policyEngineAddress
    );

    await auditLogger.authorizeLogger(
      await assetNFT.getAddress()
    );

    // 6. Create test DID
    await didRegistry.createDID(
      DID,
      "ipfs://security-did-document",
      adminAddress
    );
  });

  async function createRoles() {
    await policyEngine.createRole(
      ADMIN_ROLE,
      "Admin"
    );

    await policyEngine.createRole(
      MANAGER_ROLE,
      "Manager"
    );

    await policyEngine.createRole(
      USER_ROLE,
      "User"
    );
  }

  async function setupAdminMintPermission() {
    await createRoles();

    await policyEngine.assignRole(
      adminAddress,
      ADMIN_ROLE
    );

    await policyEngine.setPermission(
      ADMIN_ROLE,
      ASSET_RESOURCE,
      MINT_ACTION,
      true
    );
  }

  async function setupAdminTransferPermission() {
    await policyEngine.setPermission(
      ADMIN_ROLE,
      ASSET_RESOURCE,
      TRANSFER_ACTION,
      true
    );
  }

  async function mintTestAsset() {
    await setupAdminMintPermission();

    await assetNFT.mintAsset(
      userAddress,
      DID,
      "ipfs://security-asset"
    );
  }

  describe("Authorization Bypass", function () {
    it("blocks an unauthorized user from minting", async function () {
      await setupAdminMintPermission();

      await expect(
        assetNFT
          .connect(user)
          .mintAsset(
            userAddress,
            DID,
            "ipfs://unauthorized"
          )
      ).to.be.revert(ethers);
    });

    it("blocks an attacker from minting", async function () {
      await setupAdminMintPermission();

      await expect(
        assetNFT
          .connect(attacker)
          .mintAsset(
            attackerAddress,
            DID,
            "ipfs://malicious"
          )
      ).to.be.revert(ethers);
    });

    it("blocks an admin without explicit mint permission", async function () {
      await policyEngine.createRole(
        ADMIN_ROLE,
        "Admin"
      );

      await policyEngine.assignRole(
        adminAddress,
        ADMIN_ROLE
      );

      await expect(
        assetNFT.mintAsset(
          userAddress,
          DID,
          "ipfs://blocked"
        )
      ).to.be.revert(ethers);
    });

    it("blocks unauthorized Asset Admin role assignment", async function () {
      const assetAdminRole =
        await assetNFT.ASSET_ADMIN_ROLE();

      await expect(
        assetNFT
          .connect(attacker)
          .grantRole(
            assetAdminRole,
            attackerAddress
          )
      ).to.be.revert(ethers);
    });
  });

  describe("Privilege Escalation", function () {
    it("prevents a user from assigning themselves Admin", async function () {
      await createRoles();

      await expect(
        policyEngine
          .connect(user)
          .assignRole(
            userAddress,
            ADMIN_ROLE
          )
      ).to.be.revert(ethers);
    });

    it("prevents a manager from assigning themselves Admin", async function () {
      await createRoles();

      await policyEngine.assignRole(
        managerAddress,
        MANAGER_ROLE
      );

      await expect(
        policyEngine
          .connect(manager)
          .assignRole(
            managerAddress,
            ADMIN_ROLE
          )
      ).to.be.revert(ethers);
    });

    it("prevents an attacker from modifying permissions", async function () {
      await createRoles();

      await expect(
        policyEngine
          .connect(attacker)
          .setPermission(
            ADMIN_ROLE,
            ASSET_RESOURCE,
            MINT_ACTION,
            true
          )
      ).to.be.revert(ethers);
    });

    it("prevents an attacker from changing another user's role", async function () {
      await createRoles();

      await policyEngine.assignRole(
        userAddress,
        USER_ROLE
      );

      await expect(
        policyEngine
          .connect(attacker)
          .assignRole(
            userAddress,
            ADMIN_ROLE
          )
      ).to.be.revert(ethers);

      expect(
        await policyEngine.getUserRole(
          userAddress
        )
      ).to.equal(USER_ROLE);
    });
  });

  describe("Input Validation", function () {
    it("rejects zero recipient during asset minting", async function () {
      await setupAdminMintPermission();

      await expect(
        assetNFT.mintAsset(
          ethers.ZeroAddress,
          DID,
          "ipfs://asset"
        )
      ).to.be.revert(ethers);
    });

    it("rejects empty DID during asset minting", async function () {
      await setupAdminMintPermission();

      await expect(
        assetNFT.mintAsset(
          userAddress,
          "",
          "ipfs://asset"
        )
      ).to.be.revert(ethers);
    });

    it("rejects nonexistent DID during asset minting", async function () {
      await setupAdminMintPermission();

      await expect(
        assetNFT.mintAsset(
          userAddress,
          "did:trustmesh:does-not-exist",
          "ipfs://asset"
        )
      ).to.be.revert(ethers);
    });

    it("rejects empty metadata during asset minting", async function () {
      await setupAdminMintPermission();

      await expect(
        assetNFT.mintAsset(
          userAddress,
          DID,
          ""
        )
      ).to.be.revert(ethers);
    });
  });

  describe("State Integrity", function () {
    it("does not create an asset after unauthorized minting", async function () {
      await setupAdminMintPermission();

      expect(
        await assetNFT.assetExists(1)
      ).to.equal(false);

      await expect(
        assetNFT
          .connect(attacker)
          .mintAsset(
            attackerAddress,
            DID,
            "ipfs://malicious"
          )
      ).to.be.revert(ethers);

      expect(
        await assetNFT.assetExists(1)
      ).to.equal(false);
    });

    it("does not change role state after unauthorized role assignment", async function () {
      await createRoles();

      await policyEngine.assignRole(
        userAddress,
        USER_ROLE
      );

      expect(
        await policyEngine.getUserRole(
          userAddress
        )
      ).to.equal(USER_ROLE);

      await expect(
        policyEngine
          .connect(attacker)
          .assignRole(
            userAddress,
            ADMIN_ROLE
          )
      ).to.be.revert(ethers);

      expect(
        await policyEngine.getUserRole(
          userAddress
        )
      ).to.equal(USER_ROLE);
    });

    it("does not change ownership after unauthorized transfer", async function () {
      await mintTestAsset();

      expect(
        await assetNFT.ownerOf(1)
      ).to.equal(userAddress);

      await expect(
        assetNFT
          .connect(attacker)
          .transferFrom(
            userAddress,
            attackerAddress,
            1
          )
      ).to.be.revert(ethers);

      expect(
        await assetNFT.ownerOf(1)
      ).to.equal(userAddress);
    });

    it("does not change DID association after unauthorized transfer", async function () {
      await mintTestAsset();

      await expect(
        assetNFT
          .connect(attacker)
          .transferFrom(
            userAddress,
            attackerAddress,
            1
          )
      ).to.be.revert(ethers);

      expect(
        await assetNFT.assetDID(1)
      ).to.equal(DID_HASH);
    });
  });

  describe("Permission Enforcement", function () {
    it("denies access when permission is absent", async function () {
      await createRoles();

      await policyEngine.assignRole(
        adminAddress,
        ADMIN_ROLE
      );

      const allowed =
        await policyEngine.checkAccess.staticCall(
          adminAddress,
          ASSET_RESOURCE,
          MINT_ACTION
        );

      expect(allowed).to.equal(false);
    });

    it("allows access when permission is explicitly granted", async function () {
      await createRoles();

      await policyEngine.assignRole(
        adminAddress,
        ADMIN_ROLE
      );

      await policyEngine.setPermission(
        ADMIN_ROLE,
        ASSET_RESOURCE,
        MINT_ACTION,
        true
      );

      const allowed =
        await policyEngine.checkAccess.staticCall(
          adminAddress,
          ASSET_RESOURCE,
          MINT_ACTION
        );

      expect(allowed).to.equal(true);
    });

    it("denies access after permission revocation", async function () {
      await createRoles();

      await policyEngine.assignRole(
        adminAddress,
        ADMIN_ROLE
      );

      await policyEngine.setPermission(
        ADMIN_ROLE,
        ASSET_RESOURCE,
        MINT_ACTION,
        true
      );

      let allowed =
        await policyEngine.checkAccess.staticCall(
          adminAddress,
          ASSET_RESOURCE,
          MINT_ACTION
        );

      expect(allowed).to.equal(true);

      await policyEngine.setPermission(
        ADMIN_ROLE,
        ASSET_RESOURCE,
        MINT_ACTION,
        false
      );

      allowed =
        await policyEngine.checkAccess.staticCall(
          adminAddress,
          ASSET_RESOURCE,
          MINT_ACTION
        );

      expect(allowed).to.equal(false);
    });

    it("does not inherit permissions between roles", async function () {
      await createRoles();

      await policyEngine.assignRole(
        managerAddress,
        MANAGER_ROLE
      );

      await policyEngine.setPermission(
        ADMIN_ROLE,
        ASSET_RESOURCE,
        MINT_ACTION,
        true
      );

      const allowed =
        await policyEngine.checkAccess.staticCall(
          managerAddress,
          ASSET_RESOURCE,
          MINT_ACTION
        );

      expect(allowed).to.equal(false);
    });
  });

  describe("Asset Transfer Security", function () {
    it("blocks transfer when permission is absent", async function () {
      await mintTestAsset();

      await expect(
        assetNFT
          .connect(user)
          .transferFrom(
            userAddress,
            attackerAddress,
            1
          )
      ).to.be.revert(ethers);
    });

    it("allows transfer after required permission is granted", async function () {
      await mintTestAsset();

      await setupAdminTransferPermission();

      await policyEngine.assignRole(
        userAddress,
        ADMIN_ROLE
      );

      await expect(
        assetNFT
          .connect(user)
          .transferFrom(
            userAddress,
            attackerAddress,
            1
          )
      ).to.not.be.revert(ethers);

      expect(
        await assetNFT.ownerOf(1)
      ).to.equal(attackerAddress);
    });

    it("preserves the asset DID during authorized transfer", async function () {
      await mintTestAsset();

      await setupAdminTransferPermission();

      await policyEngine.assignRole(
        userAddress,
        ADMIN_ROLE
      );

      await assetNFT
        .connect(user)
        .transferFrom(
          userAddress,
          attackerAddress,
          1
        );

      expect(
        await assetNFT.assetDID(1)
      ).to.equal(DID_HASH);
    });
  });
});