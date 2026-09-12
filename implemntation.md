# TRUSTMESH — COPILOT BUILD LOOP

You are working directly inside the existing TrustMesh repository.

## OBJECTIVE

For this iteration, implement the next 2-hour MVP scope:

1. Dummy Organization Website
2. TrustMesh integration
3. Protected resources
4. Protected admin action
5. Attack prevention
6. Attack detection
7. Attack → Audit Event
8. Attack → AI Security Agent
9. Attack → Risk Analysis
10. Attack → Suspension
11. Security Center Incident
12. Trust/Risk Graph
13. Attack Simulation Mode
14. Risk-Based Adaptive Access
15. Policy Impact Simulator
16. LLM Security Copilot

DO NOT rebuild existing completed functionality.

DO NOT create a parallel architecture.

DO NOT replace existing working implementations unless required for integration.

---

# EXISTING TRUSTMESH ARCHITECTURE

TrustMesh is organization-agnostic.

It is NOT a college-management application.

The organization defines:

* identities
* roles
* permissions
* resources
* policies
* protected actions

TrustMesh operates as a reusable security/access-control layer above an existing application.

The Dummy Organization Website is only an integration proof.

Conceptually:

Existing Application
↓
TrustMesh Integration Layer
↓
DID / Identity
↓
PolicyEngine / RBAC
↓
Authorization Decision
↓
Audit Event
↓
Security Agent
↓
Threat Detection
↓
Risk Analysis
↓
Adaptive Restriction
↓
Incident / Alert / Copilot

---

# ALREADY COMPLETED — DO NOT REIMPLEMENT

Treat these as existing functionality:

* Project architecture
* Organization-agnostic architecture
* DID / Identity
* DID creation / resolution
* Key rotation
* PolicyEngine / RBAC
* Organization-defined roles
* Organization-defined permissions
* Access-control enforcement
* Generic resources
* Asset management
* Asset → DID association
* Audit layer
* Audit UI
* FastAPI backend
* PostgreSQL
* SQLAlchemy / repositories
* Alembic
* React frontend
* Dashboard
* Identity UI
* Policy/RBAC UI
* Resources UI
* Assets UI
* Audit UI
* Security Center
* Recovery / Sentinel
* Security Findings
* Local SIWE authentication
* AI Security Agent core

Existing Acme University Portal / attack demo may already exist.
Reuse it where useful, but the new integration must be organization-agnostic.

---

# BUILD ORDER

Implement the work in this exact order.

## STEP 1 — INSPECT FIRST

Before modifying anything:

* inspect frontend structure
* inspect backend structure
* inspect blockchain integration
* inspect PolicyEngine integration
* inspect audit event implementation
* inspect current AI Security Agent
* inspect Security Center
* inspect existing `/portal`
* inspect existing tests

Identify reusable services/components before creating new files.

Do not guess existing APIs.

Use the actual repository implementation.

---

# STEP 2 — DUMMY ORGANIZATION WEBSITE

Create a generic demonstration application representing an organization.

Do NOT hard-code the concept around a university.

Use a neutral organization such as:

"Acme Organization"

The website should contain:

* organization identity
* logged-in identity
* role
* protected resources
* normal user actions
* admin-only actions
* authorization result
* security status

Example resources:

* Employee Records
* Documents
* Digital Assets
* Admin Console

The purpose is to demonstrate:

Existing Application
↓
TrustMesh

not:

TrustMesh = College Portal.

---

# STEP 3 — TRUSTMESH INTEGRATION

The dummy website must send authorization requests to TrustMesh.

Conceptual request:

identity
+
resource
+
action
↓
TrustMesh PolicyEngine
↓
ALLOW / STEP-UP / DENY

Reuse the existing PolicyEngine and backend services.

Do not create a second authorization engine.

The PolicyEngine remains the single authorization authority.

---

# STEP 4 — PROTECTED RESOURCES

Define multiple organization resources.

At minimum:

* normal protected resource
* admin-only resource

Example:

USER → READ → Employee Records → ALLOW

USER → ADMIN → Admin Console → DENY

ADMIN → ADMIN → Admin Console → ALLOW

Make the resource/action model generic.

---

# STEP 5 — PROTECTED ADMIN ATTACK

Create a visible attack scenario.

Normal user attempts:

ADMIN operation

against:

protected Admin Console

Expected:

PolicyEngine
↓
DENY
↓
request blocked
↓
AccessDenied audit event

The unauthorized operation MUST NOT execute.

This must be an actual authorization failure, not only a UI message.

---

# STEP 6 — ATTACK SIMULATION MODE

Add:

"Simulate Attack"

button.

This must generate controlled synthetic unauthorized requests.

The simulation should create a realistic sequence such as:

1 unauthorized attempt
2 repeated unauthorized attempt
3 repeated attempts
4 escalation
5 critical/multiple violation

Do not perform destructive actions.

The simulation exists only to demonstrate TrustMesh detection and response.

Provide clear UI state showing:

ATTACK SIMULATION ACTIVE

and the generated events.

---

# STEP 7 — SECURITY CHECKPOINTS

Implement the security checkpoint model:

Identity
↓
Role
↓
Permission
↓
Resource
↓
Action
↓
Policy Decision

Every authorization attempt should be representable as checkpoint evidence.

Record which checkpoint failed.

Examples:

* unknown identity
* invalid role
* missing permission
* protected resource
* forbidden action
* policy denial

Use existing audit infrastructure where possible.

---

# STEP 8 — CHECKPOINT VIOLATION DETECTION

When an authorization request violates a checkpoint:

create a security finding containing:

* identity
* role
* permission
* resource
* action
* failed checkpoint
* timestamp
* decision
* evidence

Example:

CHECKPOINT VIOLATION

Identity: did:trustmesh:user123
Role: User
Resource: Admin Console
Action: DELETE
Failed checkpoint: Permission
Decision: DENIED

---

# STEP 9 — THREAT DETECTION

Connect security findings/events to the existing AI Security Agent.

Detect patterns such as:

* repeated unauthorized access
* repeated admin attempts
* privilege escalation probing
* rapid repeated failures
* multiple violations from one identity

Do not make the AI a generic chatbot.

The agent must consume actual TrustMesh evidence.

---

# STEP 10 — RISK ESCALATION

Implement:

LOW
↓
MEDIUM
↓
HIGH
↓
CRITICAL

Use deterministic rules for the MVP.

Example:

1 violation → LOW

3 repeated violations → MEDIUM

5+ rapid violations → HIGH

critical/admin privilege attack → HIGH/CRITICAL

multiple serious violations → CRITICAL

Keep the thresholds configurable.

Do not hard-code logic into UI components.

---

# STEP 11 — ADAPTIVE ACCESS

Implement:

LOW → ALLOW
MEDIUM → STEP-UP
HIGH → DENY
CRITICAL → DENY + SUSPEND

The result must be visible in the Security Center.

Do not pretend a step-up authentication mechanism exists if it has not been implemented.

For MVP, represent STEP-UP as an explicit security decision/state.

---

# STEP 12 — AUTOMATIC SUSPENSION

Implement a suspension state for suspicious identities.

Example:

CRITICAL RISK
+
multiple violations
↓
SUSPEND IDENTITY

After suspension:

identity
↓
protected resource
↓
DENIED

The suspension must be enforced by the application/security layer, not merely displayed in the UI.

Reuse existing Recovery/Sentinel functionality if compatible.

Do not break recovery functionality.

---

# STEP 13 — INCIDENT CREATION

When an attack reaches the configured threshold:

create an incident.

Incident should contain:

* incident ID
* identity
* attack type
* affected resource
* action
* violations
* risk score
* severity
* decision
* suspension state
* timestamps
* evidence

Example:

INC-001

Attack:
Privilege Escalation Attempt

Identity:
did:trustmesh:user123

Risk:
HIGH

Action:
Admin operation

Decision:
BLOCKED

Status:
SUSPENDED

---

# STEP 14 — INCIDENT TIMELINE

Display:

Attack
↓
Checkpoint violation
↓
Policy denial
↓
Audit event
↓
Threat detection
↓
Risk escalation
↓
Adaptive restriction
↓
Suspension
↓
Incident

Timeline must use actual stored/generated evidence.

Do not fabricate timeline entries.

---

# STEP 15 — SECURITY CENTER

Upgrade the existing Security Center rather than creating another dashboard.

Show:

* current security status
* risk score
* severity
* active incidents
* suspicious identities
* attack type
* affected resources
* blocked requests
* suspension status
* incident timeline
* evidence
* AI recommendation

Use the existing UI design system.

Only make demo-critical UI changes.

---

# STEP 16 — TRUST / RISK GRAPH

Add a visual relationship graph:

DID
↓
Role
↓
Resource
↓
Event
↓
Threat
↓
Risk

The graph must be based on actual incident/security data.

At minimum show:

identity
role
resource
event
threat
risk

Keep it lightweight and demo-friendly.

Do not add a heavy graph database.

Use existing API data/state.

---

# STEP 17 — POLICY IMPACT SIMULATOR

Create a simulation interface where an administrator can change a policy hypothetically.

Example:

Current:

User → READ → Employee Records → ALLOW

Simulate:

User → READ → Employee Records → DENY

Show:

* affected identities
* affected resources
* affected actions
* before decision
* simulated decision

IMPORTANT:

Simulation must NOT silently mutate production policy.

It is a preview.

---

# STEP 18 — LLM SECURITY COPILOT

Add an LLM Security Copilot to the Security Center.

It is NOT a general-purpose chatbot.

Input:

actual TrustMesh evidence:

* identity
* role
* resource
* action
* policy result
* violations
* timestamps
* risk score
* threat type
* suspension status

Output:

1. What happened
2. Why it is suspicious
3. Evidence
4. Risk explanation
5. Recommended response

Example:

THREAT ANALYSIS

Repeated unauthorized administrative requests were detected from the same identity.

Risk: HIGH

Likely behavior:
Privilege escalation probing.

Evidence:
5 denied administrative requests within the configured detection window.

Recommendation:
Temporarily restrict the identity and review the associated audit events.

If an external LLM provider is already configured, reuse it.

If not, implement the integration boundary cleanly and use a deterministic fallback so the demo remains functional.

Do not expose secrets in frontend code.

---

# STEP 19 — COMPLETE ATTACK FLOW

The final demo must work as:

Dummy Organization Website
↓
Normal User
↓
Protected Admin Action
↓
TrustMesh
↓
PolicyEngine
↓
DENY
↓
AccessDenied
↓
Audit
↓
Security Checkpoint Violation
↓
Threat Detection
↓
Risk Score
↓
HIGH / CRITICAL
↓
Adaptive Restriction
↓
Suspension
↓
Incident
↓
Security Center
↓
Trust/Risk Graph
↓
LLM Security Copilot

---

# STEP 20 — TEST THE COMPLETE FLOW

Add or update tests for:

### Authorization

* authorized request → ALLOW
* unauthorized request → DENY

### Attack

* unauthorized admin action is blocked
* AccessDenied event generated
* violation recorded

### Detection

* repeated violations detected
* threat classification generated

### Risk

* LOW
* MEDIUM
* HIGH
* CRITICAL

### Restriction

* LOW allows
* MEDIUM produces STEP-UP state
* HIGH denies
* CRITICAL denies + suspension

### Suspension

* suspended identity cannot access protected resource

### Incident

* incident created
* evidence attached
* timeline generated

### Simulation

* attack simulation creates synthetic events
* no destructive operation occurs

### Policy simulator

* simulated policy does not mutate actual policy

### Copilot

* receives real evidence
* produces explanation/recommendation
* fallback works if LLM unavailable

---

# IMPLEMENTATION RULES

1. Reuse existing architecture.
2. Reuse existing contracts.
3. Reuse existing PolicyEngine.
4. Reuse existing audit events.
5. Reuse existing Security Center.
6. Reuse existing Recovery/Sentinel where appropriate.
7. Do not create duplicate authorization logic.
8. Do not create fake blockchain events.
9. Do not fabricate security evidence.
10. Do not expose API keys/secrets.
11. Keep the system organization-agnostic.
12. Keep the Dummy Organization generic.
13. Keep blockchain as source of truth where applicable.
14. Keep PostgreSQL as query/index storage.
15. Keep AI grounded in actual security evidence.
16. Keep irreversible autonomous actions out of the MVP.
17. Do not break currently passing functionality.
18. Do not rewrite working modules unnecessarily.
19. Do not add unnecessary dependencies.
20. Do not create documentation for functionality that does not exist.

---

# IMPORTANT EXECUTION LOOP

Work continuously in this loop:

INSPECT
→ PLAN
→ IMPLEMENT
→ RUN TESTS
→ FIX
→ RUN TESTS AGAIN
→ VERIFY INTEGRATION
→ CONTINUE

Do NOT stop after implementing one component if the next component can be completed safely.

After each major implementation:

* run relevant backend tests
* run relevant frontend tests
* run lint
* run build
* inspect diagnostics
* fix failures immediately

Then continue to the next unfinished item.

---

# PRIORITY ORDER

If time becomes limited, prioritize exactly:

P0:
49 Dummy Organization Website
50 TrustMesh Integration
51 Protected Resources
52 Protected Admin Action
53 Attack Prevention
54 Attack Detection
55 Attack → Audit
56 Attack → AI
57 Attack → Risk
58 Attack → Suspension
59 Security Center Incident

P1:
44 Trust/Risk Graph
45 Attack Simulation Mode
46 Risk-Based Adaptive Access
47 Policy Impact Simulator
48 LLM Security Copilot

Do NOT spend time on:

* Hyperledger
* ERC-4337
* mobile application
* unnecessary performance optimization
* production deployment
* unrelated refactoring
* cosmetic redesign

---

# FINAL ACCEPTANCE CRITERIA

Do not consider this iteration complete until the repository can demonstrate:

NORMAL REQUEST
→ ALLOW

and:

UNAUTHORIZED ADMIN REQUEST
→ BLOCK
→ AUDIT
→ DETECT
→ RISK
→ RESTRICT
→ SUSPEND
→ INCIDENT
→ SECURITY CENTER
→ GRAPH
→ AI EXPLANATION

The final system must clearly communicate:

"TrustMesh is a reusable security layer that organizations can place above existing applications to provide identity-centric authorization, immutable auditability, attack detection, adaptive access control, and AI-assisted security response."

When implementation is complete, provide a concise summary containing:

* files changed
* features implemented
* tests run
* test results
* remaining issues
* exact command(s) needed to run the demo

Do not claim something is complete unless it has been verified.
