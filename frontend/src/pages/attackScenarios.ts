export type ScenarioCategory = "Identity" | "Banking" | "Behavioral" | "Policy" | "Resource" | "High Risk";
export type ScenarioSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ScenarioMode = "single" | "sequence";

export interface AttackScenario {
  id: string;
  title: string;
  category: ScenarioCategory;
  severity: ScenarioSeverity;
  description: string;
  identity: string;
  role: string;
  target: string;
  resourceId: string;
  action: string;
  permission: string;
  risk: number;
  mode: ScenarioMode;
  endpoint: "admin" | "transfer";
}

const employee = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const restricted = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

const single = (id: string, title: string, category: ScenarioCategory, severity: ScenarioSeverity, description: string, action: string, permission: string, risk: number, endpoint: "admin" | "transfer" = "admin", role = "External", did = employee): AttackScenario => ({ id, title, category, severity, description, identity: did === employee ? "Jordan Lee" : "Alex Morgan", role, target: "Acme Bank", resourceId: endpoint === "transfer" ? "acme-bank-transfer" : "acme-bank-admin", action, permission, risk, mode: "single", endpoint });
const sequence = (id: string, title: string, category: ScenarioCategory, severity: ScenarioSeverity, description: string, action: string, permission: string, risk: number, endpoint: "admin" | "transfer" = "admin"): AttackScenario => ({ ...single(id, title, category, severity, description, action, permission, risk, endpoint), mode: "sequence" });

export const attackScenarios: AttackScenario[] = [
  single("unauthorized-resource", "Unauthorized Resource Access", "Identity", "LOW", "Request a protected bank resource outside the assigned identity context.", "READ", "READ", 25),
  single("privilege-escalation", "Privilege Escalation Attempt", "Identity", "HIGH", "Attempt to invoke an administrative capability from an unprivileged client.", "ADMIN", "ADMIN", 85),
  single("admin-by-employee", "Admin-Only Resource by Employee", "Identity", "HIGH", "Employee identity requests the bank administration console.", "ADMIN", "ADMIN", 82),
  single("role-misuse", "Role Misuse", "Identity", "MEDIUM", "A client presents an external role while requesting a privileged action.", "ADMIN", "ADMIN", 55),
  single("restricted-identity", "Restricted Identity Access", "Identity", "HIGH", "A restricted identity attempts a sensitive account operation.", "ADMIN", "ADMIN", 78, "admin", "External", restricted),
  sequence("repeated-failures", "Repeated Authorization Failures", "Identity", "HIGH", "Seven denied requests from one identity in a short window.", "ADMIN", "ADMIN", 85),
  single("unauthorized-transfer", "Unauthorized Transfer Attempt", "Banking", "HIGH", "External client attempts to move money through the protected transfer API.", "TRANSFER", "TRANSFER", 86, "transfer"),
  single("high-value-transfer", "High-Value Transfer", "Banking", "HIGH", "Synthetic high-value transfer request requires review before execution.", "TRANSFER", "TRANSFER", 88, "transfer"),
  single("restricted-destination", "Restricted Destination", "Banking", "MEDIUM", "Transfer request targets a synthetic restricted beneficiary.", "TRANSFER", "TRANSFER", 62, "transfer"),
  single("account-admin-abuse", "Account Administration Abuse", "Banking", "HIGH", "Unprivileged client attempts account administration.", "ADMIN", "ADMIN", 84),
  single("beneficiary-modification", "Unauthorized Beneficiary Modification", "Banking", "HIGH", "Attempt to modify a beneficiary without the required account permission.", "ADMIN", "ADMIN", 80),
  single("sensitive-account-operation", "Sensitive Account Operation", "Banking", "HIGH", "External identity requests a sensitive banking control-plane action.", "ADMIN", "ADMIN", 76),
  sequence("rapid-requests", "Rapid Repeated Requests", "Behavioral", "MEDIUM", "Burst of requests tests behavioral thresholds and evidence correlation.", "ADMIN", "ADMIN", 65),
  sequence("request-burst", "Request Burst", "Behavioral", "MEDIUM", "Repeated calls arrive in one controlled request burst.", "ADMIN", "ADMIN", 60),
  sequence("sequential-probing", "Sequential Resource Probing", "Behavioral", "MEDIUM", "Probe several privileged bank resources in sequence.", "ADMIN", "ADMIN", 74),
  single("suspicious-pattern", "Suspicious Access Pattern", "Behavioral", "MEDIUM", "Unusual action sequence is sent to the protected bank endpoint.", "ADMIN", "ADMIN", 70),
  sequence("denied-succession", "Multiple Denied Actions", "Behavioral", "HIGH", "Multiple denied actions in a short succession create correlated evidence.", "ADMIN", "ADMIN", 72),
  sequence("abnormal-sequence", "Abnormal Action Sequence", "Behavioral", "HIGH", "A controlled sequence ends in a privileged action attempt.", "ADMIN", "ADMIN", 77),
  single("protected-probing", "Protected Resource Probing", "Resource", "LOW", "Probe a protected resource without the required permission.", "ADMIN", "ADMIN", 28),
  single("policy-violation", "Policy Violation", "Policy", "LOW", "Request conflicts with the role and resource policy.", "ADMIN", "ADMIN", 35),
  single("resource-enumeration", "Restricted Resource Enumeration", "Resource", "MEDIUM", "Attempt to enumerate a restricted administrative resource.", "ADMIN", "ADMIN", 58),
  single("outside-assignment", "Outside Assigned Role", "Policy", "MEDIUM", "Action is outside the identity's assigned role permissions.", "ADMIN", "ADMIN", 52),
  sequence("privileged-resources", "Multiple Privileged Resources", "Resource", "HIGH", "Attempted access to multiple privileged resources.", "ADMIN", "ADMIN", 84),
  sequence("multi-stage-probing", "Multi-Stage Privilege Probing", "High Risk", "HIGH", "A multi-stage sequence escalates from probing to privileged access.", "ADMIN", "ADMIN", 87),
  sequence("denial-then-privilege", "Denial Followed by Privileged Attempt", "High Risk", "HIGH", "Repeated denial is followed by a privileged request.", "ADMIN", "ADMIN", 89),
  sequence("probing-then-transfer", "Probing Followed by Transfer", "High Risk", "CRITICAL", "Resource probing transitions into a synthetic transfer attempt.", "TRANSFER", "TRANSFER", 94, "transfer"),
  sequence("misuse-burst", "Identity Misuse + Request Burst", "High Risk", "CRITICAL", "Identity misuse combines with an abnormal request burst.", "ADMIN", "ADMIN", 92),
  sequence("high-risk-composite", "High-Risk Composite Scenario", "High Risk", "CRITICAL", "Full controlled composite of repeated privileged requests.", "ADMIN", "ADMIN", 98),
];

export const scenarioCategories = ["All", "Identity", "Banking", "Behavioral", "Policy", "Resource", "High Risk", "Critical"] as const;
export type ScenarioFilter = typeof scenarioCategories[number];
