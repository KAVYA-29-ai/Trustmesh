
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
});

