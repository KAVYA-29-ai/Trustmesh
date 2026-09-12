import { expect } from "chai";
import { network } from "hardhat";
import type { Contract, Signer } from "ethers";

const { ethers } = await network.create();

describe("AssetNFT", function () {
  let didRegistry: Contract;
  let policyEngine: Contract;
  let assetNFT: Contract;
  let auditLogger: Contract;

  let admin: Signer;
  let manager: Signer;
  let user: Signer;
  let attacker: Signer;

  let adminAddress: string;
  let managerAddress: string;
  let userAddress: string;
  let attackerAddress: string;

  let didRegistryAddress: string;
  let policyEngineAddress: string;
  let auditLoggerAddress: string;

  const DID =
    "did:trustmesh:alice";

  const ASSET_RESOURCE =
    ethers.keccak256(
      ethers.toUtf8Bytes("ASSET")
    );

  const MINT_ACTION =
    ethers.keccak256(
      ethers.toUtf8Bytes("MINT")
    );

  const TRANSFER_ACTION =
    ethers.keccak256(
      ethers.toUtf8Bytes("TRANSFER")
    );

  const DID_HASH =
    ethers.keccak256(
      ethers.toUtf8Bytes(DID)
    );

  const ADMIN_ROLE =
    ethers.keccak256(
      ethers.toUtf8Bytes("ADMIN")
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

    // 5. Authorize all TrustMesh contracts
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
      "ipfs://did-document",
      adminAddress
    );
  });

  async function setupAdminAssetPermission() {
    await policyEngine.createRole(
      ADMIN_ROLE,
      "Admin"
    );

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

  describe("Deployment", function () {
    it("sets the DIDRegistry address", async function () {
      expect(
        await assetNFT.didRegistry()
      ).to.equal(
        didRegistryAddress
      );
    });

    it("sets the PolicyEngine address", async function () {
      expect(
        await assetNFT.policyEngine()
      ).to.equal(
        policyEngineAddress
      );
    });

    it("sets the AuditLogger address", async function () {
      expect(
        await assetNFT.auditLogger()
      ).to.equal(
        auditLoggerAddress
      );
    });

    it("grants Asset Admin role to admin", async function () {
      const role =
        await assetNFT.ASSET_ADMIN_ROLE();

      expect(
        await assetNFT.hasRole(
          role,
          adminAddress
        )
      ).to.equal(true);
    });
  });

  describe("Asset Minting", function () {
    beforeEach(async function () {
      await setupAdminAssetPermission();
    });

    it("allows authorized admin to mint", async function () {
      await expect(
        assetNFT.mintAsset(
          userAddress,
          DID,
          "ipfs://asset-001"
        )
      )
        .to.emit(
          assetNFT,
          "AssetMinted"
        )
        .withArgs(
          1,
          userAddress,
          DID_HASH,
          "ipfs://asset-001"
        );
    });

    it("assigns the asset to the requested owner", async function () {
      await assetNFT.mintAsset(
        userAddress,
        DID,
        "ipfs://asset-001"
      );

      expect(
        await assetNFT.ownerOf(1)
      ).to.equal(
        userAddress
      );
    });

    it("associates the asset with the DID", async function () {
      await assetNFT.mintAsset(
        userAddress,
        DID,
        "ipfs://asset-001"
      );

      expect(
        await assetNFT.assetDID(1)
      ).to.equal(
        DID_HASH
      );
    });

    it("stores the metadata URI", async function () {
      await assetNFT.mintAsset(
        userAddress,
        DID,
        "ipfs://asset-001"
      );

      expect(
        await assetNFT.assetMetadata(1)
      ).to.equal(
        "ipfs://asset-001"
      );
    });

    it("returns metadata through tokenURI", async function () {
      await assetNFT.mintAsset(
        userAddress,
        DID,
        "ipfs://asset-001"
      );

      expect(
        await assetNFT.tokenURI(1)
      ).to.equal(
        "ipfs://asset-001"
      );
    });
  });

  describe("Unauthorized Minting", function () {
    it("rejects a user without Asset Admin role", async function () {
      await expect(
        assetNFT
          .connect(user)
          .mintAsset(
            userAddress,
            DID,
            "ipfs://asset-001"
          )
      ).to.be.revert(ethers);
    });

    it("rejects admin without PolicyEngine permission", async function () {
      const role =
        await assetNFT.ASSET_ADMIN_ROLE();

      expect(
        await assetNFT.hasRole(
          role,
          adminAddress
        )
      ).to.equal(true);

      await expect(
        assetNFT.mintAsset(
          userAddress,
          DID,
          "ipfs://asset-001"
        )
      ).to.be.revert(ethers);
    });

    it("rejects attacker minting", async function () {
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
  });

  describe("Input Validation", function () {
    beforeEach(async function () {
      await setupAdminAssetPermission();
    });

    it("rejects zero recipient", async function () {
      await expect(
        assetNFT.mintAsset(
          ethers.ZeroAddress,
          DID,
          "ipfs://asset-001"
        )
      ).to.be.revert(ethers);
    });

    it("rejects empty DID", async function () {
      await expect(
        assetNFT.mintAsset(
          userAddress,
          "",
          "ipfs://asset-001"
        )
      ).to.be.revert(ethers);
    });

    it("rejects nonexistent DID", async function () {
      await expect(
        assetNFT.mintAsset(
          userAddress,
          "did:trustmesh:nonexistent",
          "ipfs://asset-001"
        )
      ).to.be.revert(ethers);
    });

    it("rejects empty metadata", async function () {
      await expect(
        assetNFT.mintAsset(
          userAddress,
          DID,
          ""
        )
      ).to.be.revert(ethers);
    });
  });

  describe("Asset Information", function () {
    beforeEach(async function () {
      await setupAdminAssetPermission();

      await assetNFT.mintAsset(
        userAddress,
        DID,
        "ipfs://asset-001"
      );
    });

    it("returns complete asset information", async function () {
      const asset =
        await assetNFT.getAsset(1);

      expect(
        asset.didHash
      ).to.equal(DID_HASH);

      expect(
        asset.metadataURI
      ).to.equal(
        "ipfs://asset-001"
      );

      expect(
        asset.owner
      ).to.equal(
        userAddress
      );
    });

    it("confirms that the asset exists", async function () {
      expect(
        await assetNFT.assetExists(1)
      ).to.equal(true);
    });

    it("returns false for nonexistent asset", async function () {
      expect(
        await assetNFT.assetExists(999)
      ).to.equal(false);
    });
  });

  describe("Asset Transfer", function () {
    beforeEach(async function () {
      await setupAdminAssetPermission();

      await assetNFT.mintAsset(
        userAddress,
        DID,
        "ipfs://asset-001"
      );
    });

    it("rejects transfer without permission", async function () {
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

    it("allows an authorized transfer", async function () {
      await policyEngine.assignRole(
        userAddress,
        ADMIN_ROLE
      );

      await setupAdminTransferPermission();

      await expect(
        assetNFT
          .connect(user)
          .transferFrom(
            userAddress,
            attackerAddress,
            1
          )
      )
        .to.emit(
          assetNFT,
          "AssetTransferred"
        )
        .withArgs(
          1,
          userAddress,
          attackerAddress,
          DID_HASH
        );

      expect(
        await assetNFT.ownerOf(1)
      ).to.equal(
        attackerAddress
      );
    });

    it("preserves DID after transfer", async function () {
      await policyEngine.assignRole(
        userAddress,
        ADMIN_ROLE
      );

      await setupAdminTransferPermission();

      await assetNFT
        .connect(user)
        .transferFrom(
          userAddress,
          attackerAddress,
          1
        );

      expect(
        await assetNFT.assetDID(1)
      ).to.equal(
        DID_HASH
      );
    });
  });

  describe("Access Control", function () {
    it("prevents unauthorized role assignment", async function () {
      const role =
        await assetNFT.ASSET_ADMIN_ROLE();

      await expect(
        assetNFT
          .connect(attacker)
          .grantRole(
            role,
            attackerAddress
          )
      ).to.be.revert(ethers);
    });

    it("allows admin to grant Asset Admin role", async function () {
      const role =
        await assetNFT.ASSET_ADMIN_ROLE();

      await assetNFT.grantRole(
        role,
        managerAddress
      );

      expect(
        await assetNFT.hasRole(
          role,
          managerAddress
        )
      ).to.equal(true);
    });
  });
});