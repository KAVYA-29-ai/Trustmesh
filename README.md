# TrustMesh

**A self-defending, blockchain-enforced identity & access platform — built for Smart India Hackathon PS 26125.**

TrustMesh doesn't just log security incidents — it **detects, freezes, explains, and reports on them automatically**, using smart contracts as the final, tamper-proof enforcement layer instead of just a database.

> **Live local demo:** the full attack → detection → on-chain freeze → forensic report loop runs end-to-end today, on a local Hardhat chain — **no wallet, no Polygon key, no testnet funds required.** See [`docs/LOCAL-DEMO.md`](docs/LOCAL-DEMO.md) for the exact walkthrough.

---

## Why TrustMesh is different

Most identity/access-control submissions stop at "detect and log." TrustMesh closes the loop:

| Typical solution | TrustMesh |
| --- | --- |
| Detects a suspicious action, writes a log entry | Detects the action, **automatically calls `PolicyEngine.setResourceFreeze()` on-chain** — enforcement is immutable, not just a database flag |
| A human reads logs later to figure out what happened | **Forensic snapshot service** builds an integrity-hashed evidence package per transaction, ready to hand to an auditor |
| A security dashboard shows raw events | **AI Copilot** (Gemini-backed, with a deterministic fallback) explains *why* an incident was flagged, in plain language |
| Compliance is a manual spreadsheet exercise | **DPDP evidence report** is generated directly from on-chain + indexed evidence, separating "what we observed" from "what it means for compliance" — and it tells you where the evidence gaps are |
| Risk is a gut feeling | **Backend-derived insurance-style risk score** computed from real incidents, findings, and denial events |

Every one of these is **wired to real evidence** — not a mocked number on a dashboard.

## What TrustMesh does

- Registers and resolves **decentralized identities (DIDs)**, with controller-authorized key rotation.
- Enforces **roles, permissions, and access policy on-chain** via `PolicyEngine`, backed by Hardhat tests.
- Represents DID-owned resources as secured **ERC-721-style assets** (`AssetNFT`).
- Writes **immutable audit events** through a dedicated `AuditLogger` contract.
- Authenticates with **Sign-In with Ethereum (SIWE)** — nonce + persistent sessions.
- Runs a **deterministic Security Agent** on every indexed event, with optional Gemini enrichment for natural-language reasoning.
- On a confirmed incident, calls **on-chain freeze/unfreeze** through a backend transaction signer and returns the transaction hash to the UI.
- Builds **integrity-hashed forensic snapshots** per transaction (`/audit/forensic/{transaction_hash}`).
- Generates a **DPDP (India's Digital Personal Data Protection Act) evidence report** straight from indexed events and findings.
- Computes a **live insurance-style risk score** from incidents, findings, and denied events.
- Presents all of it — identity, policy, resources, assets, audit trail, security incidents, AI explanations, and compliance reports — in a React operations console.

## Architecture

```text
Identity -> Role -> Permission -> Resource -> PolicyEngine
         -> ALLOW / DENY -> Audit evidence -> SecurityAgent
         -> Risk -> Incident response -> PolicyEngine freeze
         -> Forensics / Copilot / DPDP report -> Restore
```

```text
                +----------------------+
                |   React + Vite UI    |
                | Security console, UX |
                +----------+-----------+
                           |
                           | HTTP / JSON
                           v
                +----------------------+
                |   FastAPI backend    |
                | Auth, workflow, AI    |
                +------+-----------+---+
                       |           |
               SQLAlchemy       Web3 / ethers
                       |           |
                       v           v
             +----------------+  +----------------------+
             | PostgreSQL     |  | Local Hardhat RPC    |
             | findings,      |  | deployed contracts   |
             | sessions,      |  +----------------------+
             | events, audit  |
             +----------------+

             Solidity contracts via Hardhat
   DIDRegistry | PolicyEngine | AssetNFT | AuditLogger
```

**Design principle:** the blockchain is the final enforcement and confirmation boundary. FastAPI owns authorization, evidence ingestion, incident response, and reporting logic. Gemini is optional server-side *explanation* only — it never makes an enforcement decision. React never treats its own local state as blockchain truth; every state shown is confirmed from the backend.

### Repository layout

| Path | Purpose |
| --- | --- |
| `contracts/` | Solidity contracts — identity, policy, assets, audit events |
| `test/` | Hardhat contract and security tests |
| `scripts/` | Local and optional deployment scripts |
| `backend/app/` | FastAPI app: services, repositories, indexer, models |
| `backend/app/services/forensic_audit.py` | Integrity-hashed forensic snapshot builder |
| `backend/app/services/security_reporting.py` | Risk score + DPDP evidence report generation |
| `backend/alembic/` | PostgreSQL migration history |
| `backend/tests/` | API, indexer, and security-agent tests |
| `frontend/src/pages/` | Dashboard, Identity, Policies, Assets, Audit, Security Center, AI Security, Compliance |
| `docs/LOCAL-DEMO.md` | Exact step-by-step local demo script |

## What's real vs. what's next

We'd rather be precise about this than oversell it.

### Working end-to-end today (verified locally, Hardhat `chainId 31337`)

- DID registry, key rotation, PolicyEngine/RBAC, AssetNFT, AuditLogger — all with Hardhat tests
- SIWE authentication with persistent sessions
- Full attack → denial → audit evidence → SecurityAgent → incident → **on-chain freeze/unfreeze** → restore loop
- Forensic snapshot generation, DPDP evidence report, backend-derived insurance risk score
- Deterministic security analysis (always on) with optional Gemini enrichment when `GEMINI_API_KEY` is set

### Explicitly in progress / next

- Risk-based adaptive access — allow/step-up/deny states exist; broader policy authoring is still limited
- Policy impact simulator — API and UI in progress
- Real-time external-chain event listener (current path is local indexed events, verified)
- Load/latency/throughput testing
- Public testnet deployment and hosted backend/frontend — **intentionally out of scope for this MVP**; see [`docs/LOCAL-DEMO.md`](docs/LOCAL-DEMO.md) for why the local demo is the authoritative one

We're not claiming a mainnet deployment we don't have. We are claiming a working, evidence-backed enforcement loop that a judge can run start-to-finish in a few minutes.

## Run the demo locally

No wallet, no Polygon key, no gas required.

```bash
# 1. Contracts + local chain
npx hardhat node
# in a second terminal:
npx hardhat test

# 2. Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 3. Frontend
cd frontend
npm install
npm run dev
```

Then follow [`docs/LOCAL-DEMO.md`](docs/LOCAL-DEMO.md):

1. Open `/attack`, launch a scenario against the protected Admin Console — it's denied before it succeeds.
2. Open `/security` — see identity, role, resource, severity, risk score, and evidence timeline for the incident.
3. Choose **Suspend** or **Block** — the backend calls `PolicyEngine.setResourceFreeze()` and returns a real transaction hash.
4. Choose **Unblock / Restore** — confirms `frozen=false` on-chain.
5. Open `/audit`, `/ai-security`, and `/compliance` — indexed evidence, AI explanation, and the DPDP report, all traced back to the same incident.

## Security model

- Smart contracts enforce identity ownership, controller authorization, policy checks, asset ownership, and audit-event integrity.
- The backend applies service-level authorization and owns sessions, events, findings, and incident state.
- The deterministic agent guarantees repeatable rule-based detection — Gemini enrichment never replaces it.
- Every finding traces back through the trust/risk graph to the evidence that produced it.

AI assessments are advisory. They explain and recommend — they never bypass smart-contract validation or backend authorization.

## Team / Problem statement

Built for **SIH PS 26125 — Blockchain-Based Secure Platform for Identity, Access Control, and Digital Asset Management.**

## License

No public license has been selected for this project yet.
