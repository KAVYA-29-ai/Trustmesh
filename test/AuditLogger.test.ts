
import { expect } from "chai";
import { network } from "hardhat";

let ethers: Awaited<
  ReturnType<typeof network.connect>
>["ethers"];

before(async function () {
  ({ ethers } = await network.connect());
});

describe("AuditLogger", function () {
  it(
    "does not authorize externally owned accounts as audit emitters",
    async function () {
      const [
        admin,
        account,
      ] = await ethers.getSigners();

      const auditLogger =
        await ethers.deployContract(
          "AuditLogger",
          [admin.address]
        );

      await expect(
        auditLogger.setEmitterAuthorized(
          account.address,
          true
        )
      ).to.be.revertedWithCustomError(
        auditLogger,
        "EmitterMustBeContract"
      );
    }
  );
});

