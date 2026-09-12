import { expect } from "chai";
import { network } from "hardhat";
import { ethers } from "ethers";

describe("PolicyEngine", function () {
  let policyEngine: any;
  let auditLogger: any;

  let owner: any;
  let manager: any;
  let user: any;
  let outsider: any;

  const role = (name: string) =>
    ethers.keccak256(
      ethers.toUtf8Bytes(name)
    );

  const resource = (name: string) =>
    ethers.keccak256(
      ethers.toUtf8Bytes(name)
    );

  const action = (name: string) =>
    ethers.keccak256(
      ethers.toUtf8Bytes(name)
    );

  const MANAGER =
    role("MANAGER");

  const USER =
    role("USER");

  const DOCUMENT =
    resource("DOCUMENT");

  const READ =
    action("READ");

  const WRITE =
    action("WRITE");

  const DELETE =
    action("DELETE");

  beforeEach(async function () {
    const connection =
      await network.connect();

    const signers =
      await connection.ethers.getSigners();

    [
      owner,
      manager,
      user,
      outsider
    ] = signers;

    // Deploy AuditLogger first
    const AuditLogger =
      await connection.ethers.getContractFactory(
        "AuditLogger"
      );

    auditLogger =
      await AuditLogger.deploy();

    await auditLogger.waitForDeployment();

    // Deploy PolicyEngine with AuditLogger
    const PolicyEngine =
      await connection.ethers.getContractFactory(
        "PolicyEngine"
      );

    policyEngine =
      await PolicyEngine.deploy(
        await auditLogger.getAddress()
      );

    await policyEngine.waitForDeployment();

    // Authorize PolicyEngine to write audit records
    await auditLogger.authorizeLogger(
      await policyEngine.getAddress()
    );
  });

  it("creates organization-defined roles", async function () {
    await expect(
      policyEngine.createRole(
        MANAGER,
        "Manager"
      )
    )
      .to.emit(
        policyEngine,
        "RoleCreated"
      )
      .withArgs(
        MANAGER,
        "Manager"
      );

    const result =
      await policyEngine.getRole(
        MANAGER
      );

    expect(
      result[0]
    ).to.equal(true);

    expect(
      result[1]
    ).to.equal("Manager");
  });

  it("rejects duplicate roles", async function () {
    await policyEngine.createRole(
      MANAGER,
      "Manager"
    );

    await expect(
      policyEngine.createRole(
        MANAGER,
        "Another Manager"
      )
    ).to.be.revertedWithCustomError(
      policyEngine,
      "RoleAlreadyExists"
    );
  });

  it("allows owner to assign a role", async function () {
    await policyEngine.createRole(
      MANAGER,
      "Manager"
    );

    await expect(
      policyEngine.assignRole(
        await manager.getAddress(),
        MANAGER
      )
    )
      .to.emit(
        policyEngine,
        "RoleAssigned"
      )
      .withArgs(
        await manager.getAddress(),
        MANAGER
      );

    expect(
      await policyEngine.getUserRole(
        await manager.getAddress()
      )
    ).to.equal(MANAGER);
  });

  it("blocks non-owner from assigning roles", async function () {
    await policyEngine.createRole(
      MANAGER,
      "Manager"
    );

    await expect(
      policyEngine
        .connect(user)
        .assignRole(
          await outsider.getAddress(),
          MANAGER
        )
    ).to.be.revertedWithCustomError(
      policyEngine,
      "OwnableUnauthorizedAccount"
    );
  });

  it("configures role permissions", async function () {
    await policyEngine.createRole(
      MANAGER,
      "Manager"
    );

    await policyEngine.setPermission(
      MANAGER,
      DOCUMENT,
      READ,
      true
    );

    await policyEngine.assignRole(
      await manager.getAddress(),
      MANAGER
    );

    expect(
      await policyEngine.hasPermission(
        await manager.getAddress(),
        DOCUMENT,
        READ
      )
    ).to.equal(true);
  });

  it("allows authorized access", async function () {
    await policyEngine.createRole(
      MANAGER,
      "Manager"
    );

    await policyEngine.setPermission(
      MANAGER,
      DOCUMENT,
      READ,
      true
    );

    await policyEngine.assignRole(
      await manager.getAddress(),
      MANAGER
    );

    await expect(
      policyEngine.checkAccess(
        await manager.getAddress(),
        DOCUMENT,
        READ
      )
    )
      .to.emit(
        policyEngine,
        "AccessGranted"
      )
      .withArgs(
        await manager.getAddress(),
        MANAGER,
        DOCUMENT,
        READ
      );
  });

  it("denies unauthorized access", async function () {
    await policyEngine.createRole(
      MANAGER,
      "Manager"
    );

    await policyEngine.setPermission(
      MANAGER,
      DOCUMENT,
      READ,
      true
    );

    await policyEngine.assignRole(
      await manager.getAddress(),
      MANAGER
    );

    await expect(
      policyEngine.checkAccess(
        await manager.getAddress(),
        DOCUMENT,
        DELETE
      )
    )
      .to.emit(
        policyEngine,
        "AccessDenied"
      )
      .withArgs(
        await manager.getAddress(),
        MANAGER,
        DOCUMENT,
        DELETE
      );

    expect(
      await policyEngine.hasPermission(
        await manager.getAddress(),
        DOCUMENT,
        DELETE
      )
    ).to.equal(false);
  });

  it("supports different roles with different policies", async function () {
    await policyEngine.createRole(
      MANAGER,
      "Manager"
    );

    await policyEngine.createRole(
      USER,
      "User"
    );

    await policyEngine.setPermission(
      MANAGER,
      DOCUMENT,
      READ,
      true
    );

    await policyEngine.setPermission(
      MANAGER,
      DOCUMENT,
      WRITE,
      true
    );

    await policyEngine.setPermission(
      USER,
      DOCUMENT,
      READ,
      true
    );

    await policyEngine.assignRole(
      await manager.getAddress(),
      MANAGER
    );

    await policyEngine.assignRole(
      await user.getAddress(),
      USER
    );

    expect(
      await policyEngine.hasPermission(
        await manager.getAddress(),
        DOCUMENT,
        READ
      )
    ).to.equal(true);

    expect(
      await policyEngine.hasPermission(
        await manager.getAddress(),
        DOCUMENT,
        WRITE
      )
    ).to.equal(true);

    expect(
      await policyEngine.hasPermission(
        await manager.getAddress(),
        DOCUMENT,
        DELETE
      )
    ).to.equal(false);

    expect(
      await policyEngine.hasPermission(
        await user.getAddress(),
        DOCUMENT,
        READ
      )
    ).to.equal(true);

    expect(
      await policyEngine.hasPermission(
        await user.getAddress(),
        DOCUMENT,
        WRITE
      )
    ).to.equal(false);

    expect(
      await policyEngine.hasPermission(
        await user.getAddress(),
        DOCUMENT,
        DELETE
      )
    ).to.equal(false);
  });

  it("revokes a user's role", async function () {
    await policyEngine.createRole(
      MANAGER,
      "Manager"
    );

    await policyEngine.setPermission(
      MANAGER,
      DOCUMENT,
      READ,
      true
    );

    await policyEngine.assignRole(
      await manager.getAddress(),
      MANAGER
    );

    expect(
      await policyEngine.hasPermission(
        await manager.getAddress(),
        DOCUMENT,
        READ
      )
    ).to.equal(true);

    await expect(
      policyEngine.revokeRole(
        await manager.getAddress()
      )
    )
      .to.emit(
        policyEngine,
        "RoleRevoked"
      )
      .withArgs(
        await manager.getAddress(),
        MANAGER
      );

    expect(
      await policyEngine.getUserRole(
        await manager.getAddress()
      )
    ).to.equal(
      ethers.ZeroHash
    );

    expect(
      await policyEngine.hasPermission(
        await manager.getAddress(),
        DOCUMENT,
        READ
      )
    ).to.equal(false);
  });

  it("prevents non-owner policy changes", async function () {
    await policyEngine.createRole(
      MANAGER,
      "Manager"
    );

    await expect(
      policyEngine
        .connect(user)
        .setPermission(
          MANAGER,
          DOCUMENT,
          READ,
          true
        )
    ).to.be.revertedWithCustomError(
      policyEngine,
      "OwnableUnauthorizedAccount"
    );
  });

  it("rejects invalid roles and subjects", async function () {
    await expect(
      policyEngine.createRole(
        ethers.ZeroHash,
        "Invalid"
      )
    ).to.be.revertedWithCustomError(
      policyEngine,
      "InvalidRole"
    );

    await expect(
      policyEngine.assignRole(
        await manager.getAddress(),
        MANAGER
      )
    ).to.be.revertedWithCustomError(
      policyEngine,
      "InvalidRole"
    );

    await policyEngine.createRole(
      MANAGER,
      "Manager"
    );

    await expect(
      policyEngine.assignRole(
        ethers.ZeroAddress,
        MANAGER
      )
    ).to.be.revertedWithCustomError(
      policyEngine,
      "InvalidSubject"
    );
  });
});