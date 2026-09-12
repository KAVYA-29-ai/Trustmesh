export const seededDemoIdentities: {
  employee: { address: string; did: string; name: string; role: string };
  admin: { address: string; did: string; name: string; role: string };
} = {
  employee: {
    address: "0x0000000000000000000000000000000000000002",
    did: "did:trustmesh:security",
    name: "Security Analyst",
    role: "Employee",
  },
  admin: {
    address: "0x0000000000000000000000000000000000000001",
    did: "did:trustmesh:admin",
    name: "System Administrator",
    role: "Admin",
  },
};
