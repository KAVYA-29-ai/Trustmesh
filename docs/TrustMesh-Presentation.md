# TrustMesh

## The Security Control Plane for Trustworthy Applications

TrustMesh is an identity-aware security control plane that helps applications answer a difficult question before an action executes:

> **Should this identity be trusted to perform this action on this resource right now?**

It combines identity context, role and policy evaluation, protected application actions, audit evidence, behavior analysis, risk assessment, human review, enforcement, and recovery into one explainable workflow.

TrustMesh is designed to sit above an existing organization application. The application remains the user-facing system. TrustMesh provides the security decision, evidence, and response layer.

```text
Existing Application
        |
        v
TrustMesh Checkpoint
        |
        +--> Identity and status
        +--> Role and policy evaluation
        +--> Permission decision
        +--> ALLOW / DENY
        +--> Audit evidence
        +--> Security finding
        +--> Risk assessment
        +--> Incident
        +--> Human response
        +--> Enforcement and recovery
```

---

## Executive Pitch

Modern applications do not fail only because an endpoint is missing. They fail when identity, authorization, behavior, and response are disconnected.

TrustMesh closes that gap.

A normal request can be allowed through a protected checkpoint. A suspicious request is denied by the backend, recorded as evidence, analyzed for risk, surfaced as an incident, and placed in front of a human security analyst. The analyst can accept, suspend, or block the identity. The application then enforces that state on subsequent requests. Recovery restores legitimate access only through an explicit recovery workflow.

### The product promise

- **Applications stay focused on their business workflow.**
- **TrustMesh centralizes authorization and security reasoning.**
- **Every important decision is explainable through evidence.**
- **Human analysts remain in control of disruptive security actions.**
- **Recovery is a governed state transition, not a frontend toggle.**

### What makes the demonstration compelling

The system is not a static dashboard and not a simulated success screen. It demonstrates a complete control loop:

```text
Bank action
   -> TrustMesh checkpoint
   -> ALLOW or DENY
   -> Audit event
   -> Finding and risk
   -> Incident
   -> Human Accept / Suspend / Block
   -> Backend enforcement
   -> Bank denial or continued access
   -> Recovery
   -> Active identity again
```

---

## Three-Side Demonstration

### 1. Attack Demo

Route: `/attack`

The Attack Demo is a controlled synthetic client. It targets only the fictional Acme Bank demo and uses predefined scenarios rather than real-world exploitation tooling.

It demonstrates:

- Unauthorized resource access
- Privilege escalation
- Admin-only access by an employee
- Unauthorized transfers
- Restricted destination attempts
- Repeated authorization failures
- Request bursts and sequential probing
- Policy and role violations
- High-risk composite scenarios

Each scenario shows the attacker identity, target application, target resource, action, required permission, severity, risk score, expected result, and evidence that will be generated.

The attack side cannot choose the final security decision. It can generate evidence only.

### 2. Acme Bank Demo

Routes: `/bank` and `/portal`

Acme Bank is a fictional target application used to prove integration with an existing product. It supports normal human behavior:

- Demo sign-in
- Account viewing
- Balance viewing
- Normal transfer
- Account activity
- Protected administrative actions

Every protected bank action calls the backend checkpoint. The Bank UI never pretends a request succeeded when the backend denied it.

### 3. TrustMesh Control Plane

Routes: `/dashboard`, `/identities`, `/policies`, `/resources`, `/assets`, `/audit`, `/security`, `/ai-security`, `/recovery`

The control plane is where operators understand and govern security:

- **Security Center:** what is happening and what action the administrator should take.
- **AI Security:** why TrustMesh reached a security decision.
- **Audit Log:** persisted evidence and event history.
- **Identity:** identity status and enforcement state.
- **Recovery:** governed restoration workflow.
- **Resources and Assets:** protected organization resources and records.

The Attack Demo and Bank Demo are intentionally separate from the TrustMesh sidebar so the control plane remains operationally clear.

---

## Current Technical Architecture

```text
+-----------------------------+
| React + Vite frontend       |
| Control plane, Bank, Attack |
+--------------+--------------+
               |
               | HTTP / JSON
               v
+-----------------------------+
| FastAPI backend             |
| routers and services        |
+------+----------------------+
       |
       +--> Security workflow
       +--> Audit/indexer
       +--> Security findings
       +--> Incident decisions
       +--> Recovery service
       +--> SQLAlchemy repositories
       |
       v
+-----------------------------+
| PostgreSQL                  |
| audit, findings, recovery,  |
| identity and registry data  |
+-----------------------------+

Preserved architecture:

+-----------------------------+
| Solidity / Hardhat layer    |
| DIDRegistry                 |
| PolicyEngine                |
| AssetNFT                    |
| AuditLogger                 |
| RecoveryModule              |
+-----------------------------+
```

### Frontend

- React
- TypeScript
- Vite
- React Router
- Shared API service layer
- Control-plane pages for security operations
- Separate Bank and Attack demonstration experiences
- Responsive dark security-console visual system

### Backend

- FastAPI
- Pydantic request contracts
- SQLAlchemy
- PostgreSQL persistence
- Alembic migrations
- Audit event indexing
- Deterministic security analysis
- Optional Gemini-backed security reasoning
- Incident decision and recovery workflows

### Smart-contract architecture

The repository preserves the blockchain architecture for identity, policy, assets, audit, and recovery. The current wallet-free MVP demonstration path does not require MetaMask, SIWE, Polygon, or a live wallet connection. This allows the core security workflow to run locally and in a controlled demo environment while the blockchain layer remains available for future deployment and stronger verification requirements.

---

## Current Product Position

### Working today

The current MVP has a verified working security loop:

- Protected Bank account access
- Protected Bank transfer action
- Protected Bank admin action
- Backend authorization checkpoint
- Identity status enforcement
- ALLOW and DENY responses
- Persisted audit evidence
- Deterministic security findings
- Risk scoring and severity
- Incident creation
- Human Accept, Suspend, and Block decisions
- Multiple incident records
- Suspended identity enforcement
- Blocked identity enforcement
- Recovery request, approval, and execution
- Restored identity access
- Security Center operational view
- AI Security evidence interpretation workspace
- Identity page mapping to seeded backend identity records
- Resource registration persistence
- Audit and recovery UI integrations

### Verified identity mapping

The current controlled demo uses existing seeded identity records rather than inventing a display-only identity:

| Demo identity | Backend record | DID | Current use |
| --- | --- | --- | --- |
| Security Analyst / Employee | `identity-security` | `did:trustmesh:security` | Attack target and normal demo identity |
| System Administrator / Admin | `identity-admin` | `did:trustmesh:admin` | Privileged demo identity |

This mapping is important because the same identity must travel through the request, audit event, incident, enforcement decision, Identity page, and recovery workflow.

### Current validation results

The working repository has repeatedly validated:

- Backend test suite: **39 passed**
- Frontend production build: **passed**
- Frontend lint: **passed with existing non-blocking React effect warnings**
- End-to-end protected action lifecycle: **passed**
- Multiple incident and individual Accept/Suspend/Block lifecycle: **passed**
- Identity mapping through attack, incident, enforcement, and recovery: **passed**
- Browser route checks for Bank, Attack, and Security pages: **passed**

---

## Demonstration Script

### Normal behavior

1. Open Acme Bank.
2. Sign in as the seeded Employee identity.
3. View the account and balance.
4. Submit a normal demo transfer.
5. Show the TrustMesh checkpoint returning `ALLOW`.
6. Open Audit Log to show the protected action evidence.

### Controlled attack

1. Open Attack Demo.
2. Select a privilege escalation or unauthorized transfer scenario.
3. Review its severity, target, action, permission, and risk score.
4. Launch the simulation.
5. Show the Bank/API response as `DENY`.
6. Open Security Center and show the incident queue.
7. Open AI Security and explain why the decision was reached.

### Human response

1. Select the incident in Security Center.
2. Choose `ACCEPT` to acknowledge without restriction, or `SUSPEND` / `BLOCK` to enforce a restriction.
3. Return to Acme Bank.
4. Repeat the protected action.
5. Show that the backend rejects the suspended or blocked identity.

### Recovery

1. Open Recovery.
2. Create or use the recovery request for the affected identity.
3. Complete the approval and timelock flow.
4. Return to Acme Bank.
5. Repeat the legitimate action.
6. Show that the restored active identity is allowed again.

---

## What Has Been Difficult

### 1. Separating operational security from security reasoning

The first implementation rendered Security Center and AI Security through the same page. That made the product answer the same question twice. The current split is intentional:

- Security Center answers **what is happening and what should the administrator do?**
- AI Security answers **why did TrustMesh reach this decision?**

### 2. Preserving a working architecture while changing the demo runtime

The repository contains a blockchain and SIWE architecture, but the MVP demonstration needed to run without requiring a wallet. The solution was to preserve useful blockchain modules while keeping the controlled demo path wallet-free.

### 3. Keeping frontend state honest

Several early UI surfaces could display static or placeholder identity/policy state. The important fix was to connect the Identity page to backend enforcement status and use the same seeded identity records as the Attack and Bank flows.

### 4. Persistence and restart behavior

In-memory workflow state was insufficient for a security product. Audit events and decision evidence became the durable source for reconstructing incidents and identity state. Multiple incidents also had to remain separate instead of collapsing into one record per identity.

### 5. Resource persistence and foreign-key ownership

Resource registration initially failed when the demo organization did not exist in the database. The registration path was aligned with the existing organization model so resource creation can persist safely.

### 6. Human decisions versus automatic enforcement

A security system should detect and explain suspicious activity, but disruptive action must be governed. The workflow now supports a human decision boundary:

```text
Detection -> Evidence -> Incident -> Human review -> Enforcement
```

### 7. Keeping the frontend usable at high information density

Security operations interfaces contain identifiers, event data, severity, risk, action, state, and timelines. The UI work focused on readable hierarchy, dedicated Bank and Attack surfaces, incident queues, evidence inspection, responsive layouts, and clear severity semantics.

---

## Known Limitations and Honest Risks

These are known limitations, not hidden failures:

- The Identity and Policy pages still contain legacy presentation structures because the backend does not currently expose a complete identity directory or policy directory API.
- The deterministic security workflow is the reliable baseline; Gemini reasoning remains optional and advisory.
- The local MVP path is not a production deployment.
- Smart contracts are preserved and locally tested, but public contract deployment is not the current demo requirement.
- A live blockchain event listener and production-grade chain synchronization remain future work.
- Load testing, latency testing, and high-volume event retention testing are not complete.
- Production authentication, authorization hardening, secrets management, observability, and operational deployment still require dedicated work.
- The current demo uses seeded identities and fictional banking data. It does not connect to real financial systems.
- The frontend lint command still reports non-blocking React effect warnings in existing data-loading pages.

---

## Roadmap

### Near term: strengthen the MVP

- Add first-class backend identity directory endpoints.
- Add first-class backend policy directory and policy update endpoints.
- Replace remaining presentation-only identity and policy data with persisted records.
- Add dedicated API tests for every Bank action and every human decision.
- Add browser automation for the complete Bank -> Attack -> Security Center -> Recovery journey.
- Improve incident state history and decision audit visibility.

### Next: production readiness

- Deploy the backend outside the development container.
- Provision managed PostgreSQL with backup and retention policies.
- Add structured logging, metrics, tracing, and alerting.
- Add rate limiting, request authentication, authorization hardening, and secret rotation.
- Add load, latency, failure-recovery, and concurrency testing.
- Add explicit data-retention and privacy policies.

### Later: verifiable decentralized enforcement

- Deploy and verify contracts on the selected network.
- Connect a reliable blockchain event listener.
- Reconcile chain state and database state with clear failure handling.
- Reintroduce wallet-based user authentication only where product requirements justify it.
- Expand organization-specific adapters without duplicating TrustMesh authorization logic.

---

## Why This Matters

TrustMesh is not only an access-control API and not only a security dashboard.

Its value is the connection between the two:

- A business action is protected.
- A denied action becomes evidence.
- Evidence becomes a finding.
- Findings become an incident.
- A human decides how strongly to respond.
- The backend enforces that decision.
- Recovery restores legitimate work through a governed process.

That is the foundation for applications that can explain not only **what** they allowed or denied, but **why**, **what happened next**, and **how trust can be restored**.

---

## Project Status Summary

| Dimension | Current position |
| --- | --- |
| Product concept | Clear and demonstrable |
| Local MVP workflow | Working and tested |
| Bank integration proof | Working |
| Attack laboratory | Working with controlled scenarios |
| Security Center | Working operational control plane |
| AI Security | Working evidence-analysis workspace |
| Audit and findings | Working with persisted evidence paths |
| Suspend / Block enforcement | Working through backend checkpoint |
| Recovery | Working for suspended and blocked identities |
| Production deployment | Not complete |
| Live blockchain synchronization | Not complete |
| Enterprise hardening | Upcoming |

**TrustMesh is currently a strong local security-control-plane MVP with a verified end-to-end demonstration. The next stage is not inventing the core workflow; it is hardening, exposing missing registry APIs, deploying reliably, and proving performance and operational resilience.**
