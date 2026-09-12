# TrustMesh Local MVP

## Security model

```text
Identity -> Role -> Permission -> Resource -> PolicyEngine
         -> ALLOW / DENY -> Audit evidence -> SecurityAgent
         -> Risk -> Incident response -> PolicyEngine freeze
         -> Forensics / Copilot / DPDP report -> Restore
```

- Blockchain is the final policy enforcement and transaction-confirmation boundary.
- FastAPI orchestrates authorization, evidence ingestion, incident response, and reporting.
- Deterministic workflow rules own access decisions, thresholds, state, and freeze intent.
- Gemini is optional server-side enrichment for explanation and recommendation only.
- React exposes operator state and never treats local state as blockchain truth.

## Local network

The demo is locked to Hardhat `chainId 31337` at `http://127.0.0.1:8545`.
Existing local addresses are read from `deployment/local.env`. No browser wallet, Polygon network, or POL is required.

## Demonstration path

1. Open `/attack` and launch a controlled scenario against the protected Admin Console.
2. The Bank Demo calls the existing backend endpoint; the protected operation is denied before it succeeds.
3. `AccessDenied` evidence is indexed and analyzed by the deterministic SecurityAgent. A configured Gemini key can enrich the explanation.
4. Open `/security` to review the identity, role, resource, action, severity, risk, evidence, timeline, and response controls.
5. Choose `Suspend` or `Block`. The backend resolves the seeded DID, calls `PolicyEngine.setResourceFreeze(..., true)`, waits for a receipt, and returns the transaction hash.
6. Use `Unblock / Restore`. The existing `ACCEPT` workflow calls `setResourceFreeze(..., false)` and the UI refreshes from the backend response.
7. Open `/audit`, `/ai-security`, and `/compliance` for indexed events, findings, explanations, forensic context, and the DPDP evidence report.

## Evidence-backed surfaces

- `/security/risk-score` derives insurance risk from incidents, findings, denied events, and suspension evidence.
- `/security/reports/dpdp` separates observed evidence from compliance interpretation and reports evidence gaps.
- `/audit/forensic/{transaction_hash}` produces the existing integrity-hashed forensic snapshot.
- `/security/copilot` explains the latest incident from workflow evidence. It does not mutate state.

## Known limitations

- The current Attack Demo is a controlled deterministic scenario library, not an autonomous external attacker.
- The policy builder UI is local presentation state; authoritative demo authorization remains in the existing backend and PolicyEngine paths.
- A Gemini response cannot be verified without a configured working key and network access; deterministic fallback remains the security guarantee.
- External-chain deployment, production hosting, and real-time external-chain listeners are outside this local MVP.

## Verification

```bash
cd backend
source .venv/bin/activate
PYTHONPATH=/workspaces/Trustmesh/backend pytest -q

cd /workspaces/Trustmesh
npx hardhat test

cd frontend
npm run build
```
