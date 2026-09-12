import { expect } from "chai";
import { network } from "hardhat";

describe("DIDRegistry", function () {
  async function deployFixture() {
    const { ethers } = await network.connect();

    const [
      controller,
      attacker,
      newController,
      newKey
    ] = await ethers.getSigners();

    // Deploy AuditLogger first
    const AuditLogger =
      await ethers.getContractFactory(
        "AuditLogger"
      );

    const auditLogger =
      await AuditLogger.deploy();

    await auditLogger.waitForDeployment();

    // Deploy DIDRegistry with AuditLogger
    const DIDRegistry =
      await ethers.getContractFactory(
        "DIDRegistry"
      );

    const registry =
      await DIDRegistry.deploy(
        await auditLogger.getAddress()
      );

    await registry.waitForDeployment();

    // Authorize DIDRegistry to write audit records
    await auditLogger.authorizeLogger(
      await registry.getAddress()
    );

    return {
      registry,
      auditLogger,
      controller,
      attacker,
      newController,
      newKey,
      ethers,
    };
  }

  const did =
    "did:trustmesh:demo-user-001";

  const documentReference =
    "ipfs://bafybeigdyr-doc-001";

  it("creates and resolves a DID", async function () {
    const {
      registry,
      controller
    } = await deployFixture();

    const key =
      controller.address;

    await expect(
      registry.createDID(
        did,
        documentReference,
        key
      )
    ).to.emit(
      registry,
      "DIDCreated"
    );

    const resolved =
      await registry.resolveDID(did);

    expect(
      resolved.documentReference
    ).to.equal(
      documentReference
    );

    expect(
      resolved.controller
    ).to.equal(
      controller.address
    );

    expect(
      resolved.verificationKey
    ).to.equal(key);

    expect(
      resolved.status
    ).to.equal(1);
  });

  it("rejects duplicate DIDs", async function () {
    const {
      registry,
      controller
    } = await deployFixture();

    await registry.createDID(
      did,
      documentReference,
      controller.address
    );

    await expect(
      registry.createDID(
        did,
        documentReference,
        controller.address
      )
    ).to.be.revertedWithCustomError(
      registry,
      "DIDAlreadyExists"
    );
  });

  it("rejects invalid creation input", async function () {
    const {
      registry,
      controller,
      ethers
    } = await deployFixture();

    await expect(
      registry.createDID(
        "",
        documentReference,
        controller.address
      )
    ).to.be.revertedWithCustomError(
      registry,
      "InvalidDID"
    );

    await expect(
      registry.createDID(
        did,
        "",
        controller.address
      )
    ).to.be.revertedWithCustomError(
      registry,
      "InvalidDocumentReference"
    );

    await expect(
      registry.createDID(
        did,
        documentReference,
        ethers.ZeroAddress
      )
    ).to.be.revertedWithCustomError(
      registry,
      "InvalidVerificationKey"
    );
  });

  it("allows the controller to rotate the verification key", async function () {
    const {
      registry,
      controller,
      newKey,
      ethers
    } = await deployFixture();

    await registry.createDID(
      did,
      documentReference,
      controller.address
    );

    await expect(
      registry.rotateKey(
        did,
        newKey.address
      )
    )
      .to.emit(
        registry,
        "KeyRotated"
      )
      .withArgs(
        ethers.keccak256(
          ethers.toUtf8Bytes(did)
        ),
        controller.address,
        newKey.address
      );

    const resolved =
      await registry.resolveDID(did);

    expect(
      resolved.verificationKey
    ).to.equal(
      newKey.address
    );
  });

  it("blocks unauthorized key rotation", async function () {
    const {
      registry,
      controller,
      attacker,
      newKey
    } = await deployFixture();

    await registry.createDID(
      did,
      documentReference,
      controller.address
    );

    await expect(
      registry
        .connect(attacker)
        .rotateKey(
          did,
          newKey.address
        )
    ).to.be.revertedWithCustomError(
      registry,
      "NotController"
    );
  });

  it("allows the controller to update the document reference", async function () {
    const {
      registry,
      controller,
      ethers
    } = await deployFixture();

    await registry.createDID(
      did,
      documentReference,
      controller.address
    );

    const newReference =
      "ipfs://bafybeigdyr-doc-002";

    await expect(
      registry.updateDocumentReference(
        did,
        newReference
      )
    )
      .to.emit(
        registry,
        "DIDDocumentUpdated"
      )
      .withArgs(
        ethers.keccak256(
          ethers.toUtf8Bytes(did)
        ),
        newReference
      );

    const resolved =
      await registry.resolveDID(did);

    expect(
      resolved.documentReference
    ).to.equal(
      newReference
    );
  });

  it("allows controller transfer", async function () {
    const {
      registry,
      controller,
      newController,
      ethers
    } = await deployFixture();

    await registry.createDID(
      did,
      documentReference,
      controller.address
    );

    await expect(
      registry.updateController(
        did,
        newController.address
      )
    )
      .to.emit(
        registry,
        "ControllerUpdated"
      )
      .withArgs(
        ethers.keccak256(
          ethers.toUtf8Bytes(did)
        ),
        controller.address,
        newController.address
      );

    await expect(
      registry.rotateKey(
        did,
        controller.address
      )
    ).to.be.revertedWithCustomError(
      registry,
      "NotController"
    );
  });

  it("supports DID lifecycle revocation", async function () {
    const {
      registry,
      controller,
      newKey
    } = await deployFixture();

    await registry.createDID(
      did,
      documentReference,
      controller.address
    );

    expect(
      await registry.isActive(did)
    ).to.equal(true);

    await expect(
      registry.revokeDID(did)
    ).to.emit(
      registry,
      "DIDRevoked"
    );

    expect(
      await registry.isActive(did)
    ).to.equal(false);

    await expect(
      registry.rotateKey(
        did,
        newKey.address
      )
    ).to.be.revertedWithCustomError(
      registry,
      "DIDNotActive"
    );
  });

  it("rejects resolving an unknown DID", async function () {
    const {
      registry
    } = await deployFixture();

    await expect(
      registry.resolveDID(
        "did:trustmesh:missing"
      )
    ).to.be.revertedWithCustomError(
      registry,
      "DIDNotFound"
    );
  });
});