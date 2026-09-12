import dotenv from "dotenv";
import { resolve } from "node:path";

dotenv.config({ path: resolve(process.cwd(), ".env") });
import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();

  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY is not configured");
  }

  const deployer = new ethers.Wallet(privateKey, ethers.provider);
  const deployerAddress = await deployer.getAddress();

  console.log("=== TrustMesh Polygon Amoy Deployment ===");
  console.log(`Deployer: ${deployerAddress}`);
  console.log("Network: Polygon Amoy");
  console.log("Chain ID: 80002");

  const AuditLogger = await ethers.getContractFactory("AuditLogger");
  const auditLogger = await AuditLogger.deploy();
  await auditLogger.waitForDeployment();
  const auditLoggerAddress = await auditLogger.getAddress();
  console.log(`AuditLogger: ${auditLoggerAddress}`);

  const DIDRegistry = await ethers.getContractFactory("DIDRegistry");
  const didRegistry = await DIDRegistry.deploy(auditLoggerAddress);
  await didRegistry.waitForDeployment();
  const didRegistryAddress = await didRegistry.getAddress();
  console.log(`DIDRegistry: ${didRegistryAddress}`);

  const PolicyEngine = await ethers.getContractFactory("PolicyEngine");
  const policyEngine = await PolicyEngine.deploy(auditLoggerAddress);
  await policyEngine.waitForDeployment();
  const policyEngineAddress = await policyEngine.getAddress();
  console.log(`PolicyEngine: ${policyEngineAddress}`);

  const AssetNFT = await ethers.getContractFactory("AssetNFT");
  const assetNFT = await AssetNFT.deploy(
    deployerAddress,
    didRegistryAddress,
    policyEngineAddress,
    auditLoggerAddress
  );
  await assetNFT.waitForDeployment();
  const assetNFTAddress = await assetNFT.getAddress();
  console.log(`AssetNFT: ${assetNFTAddress}`);

  console.log("=== Authorizing Audit Loggers ===");

  for (const [name, address] of [
    ["DIDRegistry", didRegistryAddress],
    ["PolicyEngine", policyEngineAddress],
    ["AssetNFT", assetNFTAddress],
  ] as const) {
    const tx = await auditLogger.authorizeLogger(address);
    await tx.wait();
    console.log(`Authorized ${name}: ${address}`);
  }

  console.log("=== Deployment Complete ===");
  console.log(`AUDIT_LOGGER=${auditLoggerAddress}`);
  console.log(`DID_REGISTRY=${didRegistryAddress}`);
  console.log(`POLICY_ENGINE=${policyEngineAddress}`);
  console.log(`ASSET_NFT=${assetNFTAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
