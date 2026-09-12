import { expect } from "chai";
import hre from "hardhat";

describe("AuditLogger", function () {
  async function deployAuditLogger() {
    const { ethers } = await hre.network.connect();

    const [admin, logger, attacker, actor] =
      await ethers.getSigners();

    const AuditLogger =
      await ethers.getContractFactory("AuditLogger");

    const auditLogger = await AuditLogger.deploy();

    await auditLogger.waitForDeployment();

    return {
      auditLogger,
      admin,
      logger,
      attacker,
      actor,
      ethers,
    };
  }

  describe("Deployment", function () {
    it("sets the deployer as admin", async function () {
      const {
        auditLogger,
        admin,
      } = await deployAuditLogger();

      expect(
        await auditLogger.admin()
      ).to.equal(admin.address);
    });

    it("does not authorize arbitrary addresses", async function () {
      const {
        auditLogger,
        logger,
      } = await deployAuditLogger();

      expect(
        await auditLogger.isAuthorizedLogger(logger.address)
      ).to.equal(false);
    });
  });

  describe("Logger Authorization", function () {
    it("allows admin to authorize a logger", async function () {
      const {
        auditLogger,
        admin,
        logger,
      } = await deployAuditLogger();

      await expect(
        auditLogger
          .connect(admin)
          .authorizeLogger(logger.address)
      )
        .to.emit(auditLogger, "LoggerAuthorized")
        .withArgs(
          logger.address,
          admin.address
        );

      expect(
        await auditLogger.isAuthorizedLogger(logger.address)
      ).to.equal(true);
    });

    it("blocks non-admin from authorizing a logger", async function () {
      const {
        auditLogger,
        attacker,
        logger,
      } = await deployAuditLogger();

      await expect(
        auditLogger
          .connect(attacker)
          .authorizeLogger(logger.address)
      ).to.be.revertedWithCustomError(
        auditLogger,
        "Unauthorized"
      );
    });

    it("rejects zero address as logger", async function () {
      const {
        auditLogger,
        admin,
        ethers,
      } = await deployAuditLogger();

      await expect(
        auditLogger
          .connect(admin)
          .authorizeLogger(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(
        auditLogger,
        "InvalidAddress"
      );
    });

    it("allows admin to revoke a logger", async function () {
      const {
        auditLogger,
        admin,
        logger,
      } = await deployAuditLogger();

      await auditLogger
        .connect(admin)
        .authorizeLogger(logger.address);

      await expect(
        auditLogger
          .connect(admin)
          .revokeLogger(logger.address)
      )
        .to.emit(auditLogger, "LoggerRevoked")
        .withArgs(
          logger.address,
          admin.address
        );

      expect(
        await auditLogger.isAuthorizedLogger(logger.address)
      ).to.equal(false);
    });
  });

  describe("Audit Recording", function () {
    it("allows an authorized logger to record an audit event", async function () {
      const {
        auditLogger,
        admin,
        logger,
        actor,
        ethers,
      } = await deployAuditLogger();

      await auditLogger
        .connect(admin)
        .authorizeLogger(logger.address);

      const action = ethers.id("DID_CREATED");
      const resourceType = ethers.id("IDENTITY");
      const resourceId = ethers.id("did:trustmesh:user1");

      await expect(
        auditLogger
          .connect(logger)
          .recordAudit(
            actor.address,
            action,
            resourceType,
            resourceId,
            true
          )
      )
        .to.emit(auditLogger, "AuditRecorded")
        .withArgs(
          actor.address,
          logger.address,
          action,
          resourceType,
          resourceId,
          true,
          await getLatestTimestamp(ethers)
        );
    });

    it("blocks unauthorized addresses from recording audits", async function () {
      const {
        auditLogger,
        attacker,
        actor,
        ethers,
      } = await deployAuditLogger();

      await expect(
        auditLogger
          .connect(attacker)
          .recordAudit(
            actor.address,
            ethers.id("ACCESS_DENIED"),
            ethers.id("DOCUMENT"),
            ethers.id("document-1"),
            false
          )
      ).to.be.revertedWithCustomError(
        auditLogger,
        "Unauthorized"
      );
    });

    it("records failed access attempts", async function () {
      const {
        auditLogger,
        admin,
        logger,
        actor,
        ethers,
      } = await deployAuditLogger();

      await auditLogger
        .connect(admin)
        .authorizeLogger(logger.address);

      const action = ethers.id("ACCESS_DENIED");
      const resourceType = ethers.id("RESOURCE");
      const resourceId = ethers.id("admin-panel");

      await expect(
        auditLogger
          .connect(logger)
          .recordAudit(
            actor.address,
            action,
            resourceType,
            resourceId,
            false
          )
      ).to.emit(auditLogger, "AuditRecorded");
    });

    it("rejects an invalid actor address", async function () {
      const {
        auditLogger,
        admin,
        logger,
        ethers,
      } = await deployAuditLogger();

      await auditLogger
        .connect(admin)
        .authorizeLogger(logger.address);

      await expect(
        auditLogger
          .connect(logger)
          .recordAudit(
            ethers.ZeroAddress,
            ethers.id("TEST"),
            ethers.id("RESOURCE"),
            ethers.id("resource-1"),
            true
          )
      ).to.be.revertedWithCustomError(
        auditLogger,
        "InvalidAddress"
      );
    });

    it("rejects an empty action", async function () {
      const {
        auditLogger,
        admin,
        logger,
        actor,
        ethers,
      } = await deployAuditLogger();

      await auditLogger
        .connect(admin)
        .authorizeLogger(logger.address);

      await expect(
        auditLogger
          .connect(logger)
          .recordAudit(
            actor.address,
            ethers.ZeroHash,
            ethers.id("RESOURCE"),
            ethers.id("resource-1"),
            true
          )
      ).to.be.revertedWithCustomError(
        auditLogger,
        "EmptyAction"
      );
    });

    it("supports different resource types", async function () {
      const {
        auditLogger,
        admin,
        logger,
        actor,
        ethers,
      } = await deployAuditLogger();

      await auditLogger
        .connect(admin)
        .authorizeLogger(logger.address);

      await expect(
        auditLogger
          .connect(logger)
          .recordAudit(
            actor.address,
            ethers.id("READ"),
            ethers.id("DOCUMENT"),
            ethers.id("document-1"),
            true
          )
      ).to.emit(auditLogger, "AuditRecorded");

      await expect(
        auditLogger
          .connect(logger)
          .recordAudit(
            actor.address,
            ethers.id("TRANSFER"),
            ethers.id("NFT"),
            ethers.id("asset-1"),
            true
          )
      ).to.emit(auditLogger, "AuditRecorded");
    });

    it("stops a revoked logger from recording events", async function () {
      const {
        auditLogger,
        admin,
        logger,
        actor,
        ethers,
      } = await deployAuditLogger();

      await auditLogger
        .connect(admin)
        .authorizeLogger(logger.address);

      await auditLogger
        .connect(admin)
        .revokeLogger(logger.address);

      await expect(
        auditLogger
          .connect(logger)
          .recordAudit(
            actor.address,
            ethers.id("TEST"),
            ethers.id("RESOURCE"),
            ethers.id("resource-1"),
            true
          )
      ).to.be.revertedWithCustomError(
        auditLogger,
        "Unauthorized"
      );
    });
  });

  async function getLatestTimestamp(ethers: any) {
    const block =
      await ethers.provider.getBlock("latest");

    return block!.timestamp + 1;
  }
});