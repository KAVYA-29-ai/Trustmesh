import { expect } from "chai";
import { network } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

let ethers: Awaited<
  ReturnType<typeof network.connect>
>["ethers"];

before(async function () {
  ({ ethers } = await network.connect());
});

describe("PolicyEngine", function () {
  const orgId = keccak256(
    toUtf8Bytes("acme-university")
  );

  async function deployFixture() {
    const [
      superAdmin,
      orgAdmin,
      peerAdmin,
      user,
    ] = await ethers.getSigners();

    const policyEngine =
      await ethers.deployContract(
        "PolicyEngine",
        [superAdmin.address]
      );

    await policyEngine.registerOrg(
      orgId,
      orgAdmin.address
    );

    await policyEngine.assignRole(
      orgId,
      peerAdmin.address,
      await policyEngine.ADMIN_ROLE()
    );

    return {
      superAdmin,
      orgAdmin,
      peerAdmin,
      user,
      policyEngine,
    };
  }

  it(
    "only permits the super admin to revoke an Admin role",
    async function () {
      const {
        orgAdmin,
        peerAdmin,
        policyEngine,
      } = await deployFixture();

      await expect(
        policyEngine
          .connect(orgAdmin)
          .revokeRole(
            orgId,
            peerAdmin.address
          )
      ).to.be.revertedWith(
        "ONLY_SUPER_ADMIN_REVOKES_ADMIN"
      );
    }
  );

  it(
    "halts privileged configuration writes while paused",
    async function () {
      const {
        superAdmin,
        user,
        policyEngine,
      } = await deployFixture();

      await policyEngine
        .connect(superAdmin)
        .pause();

      const otherOrgId = keccak256(
        toUtf8Bytes("other-org")
      );

      await expect(
        policyEngine
          .connect(superAdmin)
          .registerOrg(
            otherOrgId,
            user.address
          )
      ).to.be.revertedWith("PAUSED");

      await expect(
        policyEngine
          .connect(superAdmin)
          .transferSuperAdmin(
            user.address
          )
      ).to.be.revertedWith("PAUSED");
    }
  );

  it(
    "denies an otherwise authorized DID while its resource is frozen",
    async function () {
      const {
        orgAdmin,
        user,
        policyEngine,
      } = await deployFixture();

      const userRole = await policyEngine.USER_ROLE();
      const resourceId = keccak256(toUtf8Bytes("confidential-report"));
      const action = "READ";

      await policyEngine
        .connect(orgAdmin)
        .assignRole(orgId, user.address, userRole);

      await policyEngine
        .connect(orgAdmin)
        .setRolePermission(
          orgId,
          userRole,
          action,
          resourceId,
          true
        );

      expect(
        await policyEngine.checkAccess(
          orgId,
          user.address,
          resourceId,
          action
        )
      ).to.equal(true);

      await expect(
        policyEngine
          .connect(orgAdmin)
          .setResourceFreeze(
            orgId,
            user.address,
            resourceId,
            true
          )
      )
        .to.emit(policyEngine, "ResourceFreezeChanged")
        .withArgs(
          orgId,
          user.address,
          resourceId,
          true,
          orgAdmin.address
        );

      expect(
        await policyEngine.checkAccess(
          orgId,
          user.address,
          resourceId,
          action
        )
      ).to.equal(false);
    }
  );

  it(
    "freezes only the targeted resource and unfreezing restores access",
    async function () {
      const {
        orgAdmin,
        user,
        policyEngine,
      } = await deployFixture();

      const userRole = await policyEngine.USER_ROLE();
      const frozenResource = keccak256(toUtf8Bytes("confidential-report"));
      const otherResource = keccak256(toUtf8Bytes("public-report"));
      const action = "READ";

      await policyEngine
        .connect(orgAdmin)
        .assignRole(orgId, user.address, userRole);

      await policyEngine
        .connect(orgAdmin)
        .setRolePermission(orgId, userRole, action, frozenResource, true);

      await policyEngine
        .connect(orgAdmin)
        .setRolePermission(orgId, userRole, action, otherResource, true);

      await policyEngine
        .connect(orgAdmin)
        .setResourceFreeze(
          orgId,
          user.address,
          frozenResource,
          true
        );

      expect(
        await policyEngine.checkAccess(
          orgId,
          user.address,
          frozenResource,
          action
        )
      ).to.equal(false);

      expect(
        await policyEngine.checkAccess(
          orgId,
          user.address,
          otherResource,
          action
        )
      ).to.equal(true);

      await policyEngine
        .connect(orgAdmin)
        .setResourceFreeze(
          orgId,
          user.address,
          frozenResource,
          false
        );

      expect(
        await policyEngine.checkAccess(
          orgId,
          user.address,
          frozenResource,
          action
        )
      ).to.equal(true);
    }
  );

  it(
    "rejects unauthorized and invalid resource freeze requests",
    async function () {
      const {
        orgAdmin,
        user,
        policyEngine,
      } = await deployFixture();

      const resourceId = keccak256(toUtf8Bytes("confidential-report"));

      await expect(
        policyEngine
          .connect(user)
          .setResourceFreeze(
            orgId,
            user.address,
            resourceId,
            true
          )
      ).to.be.revertedWith("ONLY_ORG_ADMIN");

      await expect(
        policyEngine
          .connect(orgAdmin)
          .setResourceFreeze(
            orgId,
            ethers.ZeroAddress,
            resourceId,
            true
          )
      ).to.be.revertedWith("ZERO_DID");

      await expect(
        policyEngine
          .connect(orgAdmin)
          .setResourceFreeze(
            orgId,
            user.address,
            ethers.ZeroHash,
            true
          )
      ).to.be.revertedWith("INVALID_RESOURCE_ID");
    }
  );
});
