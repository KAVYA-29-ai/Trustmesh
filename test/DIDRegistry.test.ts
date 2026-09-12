
import { expect } from "chai";
import { network } from "hardhat";

let ethers: Awaited<
  ReturnType<typeof network.connect>
>["ethers"];

before(async function () {
  ({ ethers } = await network.connect());
});

describe("DIDRegistry lifecycle extensions", function () {
  it(
    "keeps implicit ERC-1056 identities active until their controller revokes them",
    async function () {
      const [
        identity,
        nextOwner,
      ] = await ethers.getSigners();

      const registry =
        await ethers.deployContract(
          "DIDRegistry"
        );

      expect(
        await registry.isActive(
          identity.address
        )
      ).to.equal(true);

      await registry
        .connect(identity)
        .setDocumentReference(
          identity.address,
          "ipfs://bafy-document"
        );

      expect(
        await registry.documentReference(
          identity.address
        )
      ).to.equal(
        "ipfs://bafy-document"
      );

      await registry
        .connect(identity)
        .changeOwner(
          identity.address,
          nextOwner.address
        );

      await registry
        .connect(nextOwner)
        .revokeDID(
          identity.address
        );

      expect(
        await registry.isActive(
          identity.address
        )
      ).to.equal(false);

      await expect(
        registry
          .connect(nextOwner)
          .setDocumentReference(
            identity.address,
            "ipfs://new-document"
          )
      ).to.be.revertedWith(
        "DID_REVOKED"
      );
    }
  );
});

