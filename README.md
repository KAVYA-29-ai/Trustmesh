Readme · MD
<div align="center">
# 🛡️ TrustMesh 
 
### A self-defending, blockchain-enforced identity & access platform — proven by a real second application built on top of it.
 
**Smart India Hackathon — PS 26125**
*Blockchain-Based Secure Platform for Identity, Access Control, and Digital Asset Management*
 
![Status](https://img.shields.io/badge/status-local%20MVP%20verified-brightgreen)
![Chain](https://img.shields.io/badge/chain-Hardhat%2031337-blue)
![Wallet](https://img.shields.io/badge/wallet-not%20required%20for%20demo-orange)
![Stack](https://img.shields.io/badge/stack-Solidity%20%7C%20FastAPI%20%7C%20React%20%7C%20Postgres-informational)
 
</div>
 
## TL;DR
 
TrustMesh is a blockchain-enforced identity, access-control, and audit platform. Instead of just logging bad behavior, it **freezes the affected resource on-chain, explains the incident in plain English, and generates a compliance report** — automatically, with no human in the loop for the initial response.
 
SecureBank is a real banking application that plugs into TrustMesh through a client SDK (`@trustmesh/sdk-js`) instead of writing its own login or access-control logic. Its existence is the proof that TrustMesh is **infrastructure any application can sit behind**, not a single-purpose demo.
 
Everything below runs locally on a Hardhat chain. **No wallet, no Polygon key, no testnet funds, no gas.**
 
---
 
## 1. The problem this solves
 
Identity and access-control breaches share a pattern: a system detects something is wrong, but the response is slow, manual, and easy to tamper with after the fact.
 
- Logs live in a database an attacker (or a careless admin) can edit.
- Someone has to notice the alert, understand it, and manually revoke access.
- By the time access is revoked, the damage is done.
- Proving what happened, to whom, and why — for an auditor or regulator — is a separate, manual exercise.
TrustMesh closes all four gaps at once: **on-chain enforcement, automatic response, AI-generated explanation, and evidence that's structured for compliance from the start.**
 
---
 
## 2. Why this is different from a typical submission
 
| Typical identity/access project | TrustMesh |
| --- | --- |
| A demo app *about* identity and access | A **reusable SDK** (`@trustmesh/sdk-js`) plus a **second, independent application (SecureBank)** actually consuming it |
| Detects a bad action, writes a log row | Calls `PolicyEngine.setResourceFreeze()` **on-chain** — enforcement is immutable, not a flag a compromised backend could quietly flip |
| A human reads logs later to piece together what happened | A **forensic snapshot service** builds an integrity-hashed evidence package per transaction, ready for an auditor |
| A dashboard shows raw event data | An **AI Copilot** (Gemini-backed, deterministic fallback) explains *why* something was flagged, in plain language |
| Compliance is a manual spreadsheet exercise done after the fact | A **DPDP evidence report**, generated directly from on-chain and indexed evidence, that separates "what we observed" from "what it means" and names its own evidence gaps |
| Risk is a subjective judgment call | An **incident-driven risk score**, computed from real findings and denial events, exposed live |
 
Every item on the right is wired to real evidence in this codebase — not a number invented for a slide.
 
---
 
## 3. System architecture
 
```text
                    ┌──────────────────────────┐
                    │   SecureBank (React)     │   ← a real, independent application
                    │   Banking UI + access gates│
                    └────────────┬─────────────┘
                                 │  @trustmesh/sdk-js
                                 │  (TrustLayerProvider + SDK bridge)
                                 ▼
                    ┌──────────────────────────┐
                    │   TrustMesh — FastAPI     │
                    │   SIWE auth · Workflow    │
                    │   Security Agent · Reports│
                    └───────┬──────────┬────────┘
                            │          │
                    SQLAlchemy      Web3 / ethers
                            │          │
                            ▼          ▼
                ┌────────────────┐  ┌───────────────────────┐
                │   PostgreSQL   │  │   Hardhat local chain  │
                │ findings,      │  │ DIDRegistry             │
                │ sessions,      │  │ PolicyEngine            │
                │ events, audit  │  │ AssetNFT · AuditLogger  │
                └────────────────┘  └───────────────────────┘
```
 
**End-to-end decision flow:**
 
```text
Identity → Role → Permission → Resource → PolicyEngine
        → ALLOW / DENY → Audit evidence → SecurityAgent
        → Risk score → Incident response → PolicyEngine freeze (on-chain)
        → Forensic snapshot / AI Copilot explanation / DPDP report → Restore
```
 
**Design principle that makes the "reusable layer" claim real, not marketing:** SecureBank never decides who gets access. Every gate — page-level, action-level, or API-level — resolves through `TrustLayerSdkBridge` against the live `PolicyEngine` contract. The blockchain is the final enforcement and confirmation boundary; FastAPI owns orchestration and evidence; React never treats its own local state as ground truth — every state shown is confirmed from the backend.
 
---
 
## 4. What TrustMesh does (the core platform)
 
- **Decentralized identity** — registers and resolves DIDs, with controller-authorized key rotation
- **On-chain access control** — roles, permissions, and policy enforced through `PolicyEngine`, covered by Hardhat tests
- **Digital asset management** — DID-owned resources represented as secured ERC-721-style assets (`AssetNFT`)
- **Immutable audit trail** — every important action recorded through a dedicated `AuditLogger` contract
- **Authentication** — Sign-In with Ethereum (SIWE), with nonce handling and persistent sessions
- **Security detection** — a deterministic Security Agent runs on every indexed event; an optional Gemini agent adds natural-language reasoning on top, never replacing the deterministic guarantee
- **Automatic incident response** — on a confirmed incident, the backend calls on-chain freeze/unfreeze through its transaction signer and returns the transaction hash to the operator UI
- **Forensics** — integrity-hashed snapshot generation per transaction, so evidence can't be quietly edited after the fact
- **Compliance reporting** — a DPDP (India's Digital Personal Data Protection Act) evidence report generated straight from indexed events and findings, including where evidence is missing
- **Risk scoring** — a live, incident-driven score usable as an underwriting-style signal (e.g., for cyber-insurance-style use cases)
- **Operations console** — a React UI covering identity, policy, resources, assets, audit trail, security incidents, AI explanations, and compliance reports in one place
## 5. What SecureBank does (the proof-of-adoption layer)
 
- A working banking application — login, role-aware dashboard, differentiated user views — that has **no access-control logic of its own**
- Server-side API reads are protected by `require_trustlayer_access` dependencies, so the banking backend itself refuses to serve data the PolicyEngine hasn't approved
- Client-side UI gates call the SDK's `PolicyEngine` client directly through `TrustLayerSdkBridge`, so what a user *sees* always matches what the chain will actually *allow*
- Demonstrates the core thesis end to end: freeze a resource once, in TrustMesh, and a **completely separate application** immediately respects it — with zero SecureBank-specific security code to update
---
 
## 6. What's real vs. what's next (read this before asking us in Q&A)
 
We would rather state this precisely than have a judge find the gap themselves.
 
### ✅ Working end-to-end today — verified locally on Hardhat `chainId 31337`
 
- DID registry, key rotation, PolicyEngine/RBAC, AssetNFT, AuditLogger — all covered by Hardhat tests
- SIWE authentication with persistent sessions
- Full loop: attack → denial → audit evidence → SecurityAgent → incident → **on-chain freeze/unfreeze** → restore
- Forensic snapshot generation, DPDP evidence report, incident-driven risk score
- Deterministic security analysis (always on); optional Gemini enrichment when `GEMINI_API_KEY` is configured
- SecureBank fully wired to TrustMesh via `@trustmesh/sdk-js` — login, role-aware gating, and server-side enforcement all confirmed against the live PolicyEngine
### 🔜 Explicitly in progress / next
 
- Risk-based adaptive access — allow / step-up / deny states exist; broader policy authoring is still limited
- Policy impact simulator — API and UI in progress
- Real-time external-chain event listener — current path is local indexed events, verified; live external-chain streaming is next
- Load, latency, and throughput testing
- Public testnet deployment and hosted backend/frontend — **intentionally out of scope for this MVP**
**What we are not claiming:** a mainnet deployment we don't have, or a fully autonomous external attacker simulation.
**What we are claiming:** a working, evidence-backed enforcement loop, spanning two real applications, runnable start-to-finish in minutes, with no wallet and no gas.
 
---
 
## 7. Run it locally
 
No wallet, no Polygon key, no testnet funds, no gas.
 
```bash
# 1. TrustMesh — contracts + local chain
npx hardhat node
npx hardhat test          # run in a second terminal; confirms all contracts
 
# 2. TrustMesh — backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
 
# 3. TrustMesh — frontend
cd frontend
npm install && npm run dev
 
# 4. SecureBank — the consuming application
cd artifacts/securebank
pnpm install
# copy deployed contract addresses into artifacts/securebank/.env
# set VITE_TRUSTMESH_API_BASE_URL, VITE_RPC_URL, VITE_CHAIN_ID, VITE_TRUSTMESH_ORG_ID
pnpm dev
```
 
### Demo script (5 minutes, judge-ready)
 
1. Open TrustMesh `/attack`, launch a scenario against the protected Admin Console — it's denied before it succeeds.
2. Open `/security` — see identity, role, resource, severity, risk score, and evidence timeline for the incident.
3. Choose **Suspend** or **Block** — the backend calls `PolicyEngine.setResourceFreeze()` on-chain and returns a real transaction hash.
4. Open `/audit`, `/ai-security`, and `/compliance` — indexed evidence, AI explanation, and the DPDP report, all traced back to the same incident.
5. Open **SecureBank**, log in with the same identity, and show the frozen resource is now inaccessible **from a completely separate application** — with zero SecureBank-specific access-control code involved.
Step 5 is the actual proof of the pitch: one enforcement decision, respected everywhere it matters.
 
---
 
## 8. Security model
 
- Smart contracts enforce identity ownership, controller authorization, policy checks, asset ownership, and audit-event integrity
- The backend applies service-level authorization and owns sessions, events, findings, and incident state
- The deterministic agent guarantees repeatable, rule-based detection — Gemini enrichment adds explanation, never replaces this guarantee
- Every finding traces back through the trust/risk graph to the exact evidence that produced it
- AI assessments are advisory only: they explain and recommend, and never bypass smart-contract validation or backend authorization
---
 
## 9. Repository layout
 
| Path | Purpose |
| --- | --- |
| `contracts/` | Solidity contracts — identity, policy, assets, audit events |
| `test/` | Hardhat contract and security tests |
| `backend/app/` | FastAPI app: services, repositories, indexer, models |
| `backend/app/services/forensic_audit.py` | Integrity-hashed forensic snapshot builder |
| `backend/app/services/security_reporting.py` | Risk score and DPDP evidence report generation |
| `frontend/src/pages/` | TrustMesh operations console — Dashboard, Identity, Policies, Assets, Audit, Security, Compliance |
| `packages/sdk-js/` | `@trustmesh/sdk-js` — the reusable client SDK any application integrates against |
| `artifacts/securebank/` | SecureBank — a real banking application consuming TrustMesh via the SDK |
| `artifacts/securebank/src/integrations/` | `TrustLayerProvider`, `TrustLayerSdkBridge` — the exact integration surface between the two systems |
 
---
 
## 10. Who this is for, and how it could earn revenue
 
**Target users:** banks and fintechs, government e-governance portals, hospitals, universities — any organization where identity and access control failures are expensive and hard to prove after the fact.
 
**Possible revenue model** (for context, not a commitment):
- SaaS subscription, priced per active identity or per organization, similar to how identity providers like Okta or Auth0 price today
- Usage-based API pricing per identity verification or access check
- A higher-margin **compliance-as-a-service** add-on — auto-generated DPDP/SOC2-style reports for enterprises
- A **risk-scoring data product** for cyber-insurance underwriting
- Government/PSU deployment through GeM (Government e-Marketplace) empanelment for state e-governance portals
The differentiator versus incumbents like Okta or Auth0: the same category of identity-as-a-service, but with an **immutable, on-chain audit and enforcement trail** and an **AI-driven adaptive security layer**, which centralized identity providers don't offer today.
 
---
 
## 11. Team
 
See [`CONTRIBUTORS.md`](CONTRIBUTORS.md) for team roles and contributions.
 
## 12. License
 
No public license has been selected for this project yet.
