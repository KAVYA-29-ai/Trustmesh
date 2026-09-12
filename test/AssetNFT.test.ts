import { expect } from "chai";
import { network } from "hardhat";
import { keccak256, toUtf8Bytes, ZeroAddress } from "ethers";

describe("AssetNFT", function () {
  let ethers: Awaited<ReturnType<typeof network.connect>>["ethers"];

  const orgId = keccak256(
    toUtf8Bytes("acme-university")
  );

  const resourceId = keccak256(
    toUtf8Bytes("NFT")
  );

  before(async function () {
    ({ ethers } = await network.connect());
  });

  async function deployFixture() {
    const [
      superAdmin,
      orgAdmin,
      recipient,
      outsider,
    ] = await ethers.getSigners();

    const didRegistry =
      await ethers.deployContract("DIDRegistry");

    const policyEngine =
      await ethers.deployContract(
        "PolicyEngine",
        [superAdmin.address]
      );

    const auditLogger =
      await ethers.deployContract(
        "AuditLogger",
        [superAdmin.address]
      );

    const assetNFT =
      await ethers.deployContract(
        "AssetNFT",
        [
          await policyEngine.getAddress(),
          await didRegistry.getAddress(),
          await auditLogger.getAddress(),
        ]
      );

    await policyEngine.registerOrg(
      orgId,
      orgAdmin.address
    );

    await policyEngine
      .connect(orgAdmin)
      .setRolePermission(
        orgId,
        await policyEngine.ADMIN_ROLE(),
        "CREATE",
        resourceId,
        true
      );

    await policyEngine
      .connect(orgAdmin)
      .setRolePermission(
        orgId,
        await policyEngine.ADMIN_ROLE(),
        "TRANSFER",
        resourceId,
        true
      );

    await auditLogger.setEmitterAuthorized(
      await assetNFT.getAddress(),
      true
    );

    return {
      superAdmin,
      orgAdmin,
      recipient,
      outsider,
      didRegistry,
      policyEngine,
      auditLogger,
      assetNFT,
    };
  }

  it(
    "requires the transaction sender to control the asserted caller DID",
    async function () {
      const {
        assetNFT,
        orgAdmin,
        outsider,
        recipient,
      } = await deployFixture();

      await expect(
        assetNFT
          .connect(outsider)
          .mintTo(
            orgId,
            orgAdmin.address,
            recipient.address,
            "cid-1"
          )
      ).to.be.revertedWithCustomError(
        assetNFT,
        "NotCallerDidOwner"
      );
    }
  );

  it(
    "rejects a zero recipient on mint",
    async function () {
      const {
        assetNFT,
        orgAdmin,
      } = await deployFixture();

      await expect(
        assetNFT
          .connect(orgAdmin)
          .mintTo(
            orgId,
            orgAdmin.address,
            ZeroAddress,
            "cid-1"
          )
      ).to.be.revertedWithCustomError(
        assetNFT,
        "ZeroRecipientDid"
      );
    }
  );

  it(
    "does not allow a transfer request to burn a token",
    async function () {
      const {
        assetNFT,
        orgAdmin,
        recipient,
      } = await deployFixture();

      await assetNFT
        .connect(orgAdmin)
        .mintTo(
          orgId,
          orgAdmin.address,
          recipient.address,
          "cid-1"
        );

      await expect(
        assetNFT
          .connect(orgAdmin)
          .transferWithAccessCheck(
            orgId,
            orgAdmin.address,
            ZeroAddress,
            1
          )
      ).to.be.revertedWithCustomError(
        assetNFT,
        "ZeroRecipientDid"
      );

      expect(
        await assetNFT.ownerOf(1)
      ).to.equal(recipient.address);
    }
  );

  it(
    "rejects transfers attempted under a different organization",
    async function () {
      const {
        assetNFT,
        orgAdmin,
        recipient,
      } = await deployFixture();

      const otherOrgId = keccak256(
        toUtf8Bytes("other-org")
      );

      await assetNFT
        .connect(orgAdmin)
        .mintTo(
          orgId,
          orgAdmin.address,
          recipient.address,
          "cid-1"
        );

      await expect(
        assetNFT
          .connect(orgAdmin)
          .transferWithAccessCheck(
            otherOrgId,
            orgAdmin.address,
            orgAdmin.address,
            1
          )
      ).to.be.revertedWithCustomError(
        assetNFT,
        "WrongOrg"
      );
    }
  );

  it(
    "blocks minting to a revoked identity",
    async function () {
      const {
        assetNFT,
        didRegistry,
        orgAdmin,
        recipient,
      } = await deployFixture();

      await didRegistry
        .connect(recipient)
        .revokeDID(recipient.address);

      await expect(
        assetNFT
          .connect(orgAdmin)
          .mintTo(
            orgId,
            orgAdmin.address,
            recipient.address,
            "cid-1"
          )
      ).to.be.revertedWithCustomError(
        assetNFT,
        "InactiveRecipientDid"
      );
    }
  );

  it(
    "blocks transfers to a revoked identity",
    async function () {
      const {
        assetNFT,
        didRegistry,
        orgAdmin,
        recipient,
        outsider,
      } = await deployFixture();

      await assetNFT
        .connect(orgAdmin)
        .mintTo(
          orgId,
          orgAdmin.address,
          recipient.address,
          "cid-1"
        );

      await didRegistry
        .connect(outsider)
        .revokeDID(outsider.address);

      await expect(
        assetNFT
          .connect(orgAdmin)
          .transferWithAccessCheck(
            orgId,
            orgAdmin.address,
            outsider.address,
            1
          )
      ).to.be.revertedWithCustomError(
        assetNFT,
        "InactiveRecipientDid"
      );
    }
  );

  it(
    "emits a typed audit event and exposes a consolidated asset read",
    async function () {
      const {
        assetNFT,
        auditLogger,
        orgAdmin,
        recipient,
      } = await deployFixture();

      await expect(
        assetNFT
          .connect(orgAdmin)
          .mintTo(
            orgId,
            orgAdmin.address,
            recipient.address,
            "cid-1"
          )
      ).to.emit(
        auditLogger,
        "TypedAuditEvent"
      );

      const asset =
        await assetNFT.getAsset(1);

      expect(asset.orgId).to.equal(orgId);
      expect(asset.metadataHash).to.equal("cid-1");
      expect(asset.owner).to.equal(
        recipient.address
      );

      expect(
        await assetNFT.assetExists(1)
      ).to.equal(true);
    }
  );
});

