import { network } from "hardhat";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { ethers } = await network.create();

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const [deployer, employee, secondAdmin] = await ethers.getSigners();

const organizationId = ethers.keccak256(
  ethers.toUtf8Bytes("acme-organization")
);
const employeeRole = ethers.keccak256(
  ethers.toUtf8Bytes("EMPLOYEE_ROLE")
);
const employeeResource = ethers.keccak256(
  ethers.toUtf8Bytes("acme-employee-records")
);
const adminResource = ethers.keccak256(
  ethers.toUtf8Bytes("acme-admin-console")
);

const employeeReadPermission = ethers.solidityPackedKeccak256(
  ["string", "bytes32"],
  ["READ", employeeResource]
);
const adminActionPermission = ethers.solidityPackedKeccak256(
  ["string", "bytes32"],
  ["ADMIN", adminResource]
);

console.log("========================================");
console.log("TrustMesh Local Deployment");
console.log("========================================");
console.log("Deployer:", deployer.address);

const networkInfo = await ethers.provider.getNetwork();

console.log("Chain ID:", networkInfo.chainId.toString());

if (networkInfo.chainId !== 31337n) {
  throw new Error(
    `Wrong network. Expected local Hardhat network (31337), got ${networkInfo.chainId}`
  );
}

const balance = await ethers.provider.getBalance(
  deployer.address
);

console.log(
  "Deployer balance:",
  ethers.formatEther(balance),
  "ETH"
);

if (balance === 0n) {
  throw new Error(
    "Deployer wallet has no ETH."
  );
}

console.log("\n[1/4] Deploying DIDRegistry...");

const didRegistry =
  await ethers.deployContract("DIDRegistry", {
    gasLimit: 2750000,
  });

await didRegistry.waitForDeployment();

const didRegistryAddress =
  await didRegistry.getAddress();

console.log(
  "DIDRegistry:",
  didRegistryAddress
);

console.log("\n[2/4] Deploying PolicyEngine...");

const policyEngine =
  await ethers.deployContract(
    "PolicyEngine",
    [deployer.address]
  );

await policyEngine.waitForDeployment();

const policyEngineAddress =
  await policyEngine.getAddress();

console.log(
  "PolicyEngine:",
  policyEngineAddress
);

console.log("\n[3/4] Deploying AuditLogger...");

const auditLogger =
  await ethers.deployContract(
    "AuditLogger",
    [deployer.address]
  );

await auditLogger.waitForDeployment();

const auditLoggerAddress =
  await auditLogger.getAddress();

console.log(
  "AuditLogger:",
  auditLoggerAddress
);

console.log("\n[4/4] Deploying AssetNFT...");

const assetNFT =
  await ethers.deployContract(
    "AssetNFT",
    [
      policyEngineAddress,
      didRegistryAddress,
      auditLoggerAddress,
    ]
  );

await assetNFT.waitForDeployment();

const assetNFTAddress =
  await assetNFT.getAddress();

console.log(
  "AssetNFT:",
  assetNFTAddress
);

console.log("\nSeeding Acme Organization PolicyEngine state...");

await (
  await policyEngine.registerOrg(
    organizationId,
    deployer.address
  )
).wait();

await (
  await policyEngine.assignRole(
    organizationId,
    employee.address,
    employeeRole
  )
).wait();

await (
  await policyEngine.assignRole(
    organizationId,
    secondAdmin.address,
    await policyEngine.ADMIN_ROLE()
  )
).wait();

for (const [resourceId, resourceType] of [
  [employeeResource, "EMPLOYEE_RECORDS"],
  [adminResource, "ADMIN_CONSOLE"],
] as const) {
  await (
    await policyEngine.registerResource(
      organizationId,
      resourceId,
      resourceType,
      ethers.ZeroAddress
    )
  ).wait();
}

await (
  await policyEngine.definePermission(
    organizationId,
    employeeReadPermission,
    "READ",
    "EMPLOYEE_RECORDS"
  )
).wait();

await (
  await policyEngine.definePermission(
    organizationId,
    adminActionPermission,
    "ADMIN",
    "ADMIN_CONSOLE"
  )
).wait();

await (
  await policyEngine.attachPermissionToResource(
    organizationId,
    employeeResource,
    employeeReadPermission
  )
).wait();

await (
  await policyEngine.attachPermissionToResource(
    organizationId,
    adminResource,
    adminActionPermission
  )
).wait();

await (
  await policyEngine.setRolePermission(
    organizationId,
    employeeRole,
    "READ",
    employeeResource,
    true
  )
).wait();

await (
  await policyEngine.setRolePermission(
    organizationId,
    await policyEngine.ADMIN_ROLE(),
    "ADMIN",
    adminResource,
    true
  )
).wait();

console.log("Organization:", "acme-organization");
console.log("Employee:", employee.address, "role EMPLOYEE_ROLE");
console.log("Admin:", secondAdmin.address, "role ADMIN_ROLE");
console.log("Employee Records: READ -> Employee");
console.log("Admin Console: ADMIN -> Admin");

console.log(
  "\nAuthorizing AssetNFT as an AuditLogger emitter..."
);

const emitterTx =
  await auditLogger.setEmitterAuthorized(
    assetNFTAddress,
    true
  );

await emitterTx.wait();

console.log(
  "AssetNFT audit emitter authorization confirmed."
);

const deployment = {
  network: "hardhatLocal",
  chainId: Number(networkInfo.chainId),
  deployer: deployer.address,
  contracts: {
    DIDRegistry: didRegistryAddress,
    PolicyEngine: policyEngineAddress,
    AuditLogger: auditLoggerAddress,
    AssetNFT: assetNFTAddress,
  },
  deployedAt: new Date().toISOString(),
};

const deploymentDir = path.resolve(repositoryRoot, "deployment");

const abiDir = path.resolve(deploymentDir, "abi");
const backendAbiDir = path.resolve(
  repositoryRoot,
  "backend",
  "app",
  "blockchain",
  "abi"
);

await mkdir(abiDir, {
  recursive: true,
});

await mkdir(backendAbiDir, {
  recursive: true,
});

await writeFile(
  path.join(
    deploymentDir,
    "addresses.json"
  ),
  JSON.stringify(
    deployment,
    null,
    2
  ) + "\n",
  "utf8"
);

await writeFile(
  path.join(
    deploymentDir,
    "local.env"
  ),
  [
    "TRUSTMESH_LOCAL=true",
    "TRUSTMESH_RPC_URL=http://127.0.0.1:8545",
    "TRUSTMESH_CHAIN_ID=31337",
    `DID_REGISTRY_ADDRESS=${didRegistryAddress}`,
    `POLICY_ENGINE_ADDRESS=${policyEngineAddress}`,
    `AUDIT_LOGGER_ADDRESS=${auditLoggerAddress}`,
    `ASSET_NFT_ADDRESS=${assetNFTAddress}`,
    "",
  ].join("\n"),
  "utf8"
);

const contracts = [
  "DIDRegistry",
  "PolicyEngine",
  "AuditLogger",
  "AssetNFT",
];

for (const contractName of contracts) {
  const contractFactory =
    await ethers.getContractFactory(
      contractName
    );

  const artifact = JSON.stringify(
    {
      contractName,
      abi: JSON.parse(
        contractFactory.interface.formatJson()
      ),
    },
    null,
    2
  ) + "\n";

  await Promise.all([
    writeFile(
      path.join(abiDir, `${contractName}.json`),
      artifact,
      "utf8"
    ),
    writeFile(
      path.join(backendAbiDir, `${contractName}.json`),
      artifact,
      "utf8"
    ),
  ]);
}

console.log("\n========================================");
console.log("Deployment complete");
console.log("========================================");

console.log(
  "\nDeployment addresses saved to:"
);

console.log(
  "deployment/addresses.json"
);

console.log(
  "\nABIs saved to:"
);

console.log(
  "deployment/abi/"
);

console.log("\nContract addresses:");

console.log(
  "DIDRegistry:",
  didRegistryAddress
);

console.log(
  "PolicyEngine:",
  policyEngineAddress
);

console.log(
  "AuditLogger:",
  auditLoggerAddress
);

console.log(
  "AssetNFT:",
  assetNFTAddress
);