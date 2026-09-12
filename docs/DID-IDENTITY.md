# TrustMesh — DID Identity

## Scope

This module implements the TrustMesh DID Identity P0 scope:

- DID creation
- DID resolution
- DID document reference
- Controller
- Key rotation
- Identity lifecycle

## Production-level target

- Secure key handling
- Validation
- Events
- Tests
- Recovery-ready design

## Design

The blockchain stores the DID registry state and a reference to the DID Document. The document itself is represented by an external reference such as an IPFS CID; private keys are never stored on-chain.

A DID is indexed by `keccak256(did)` for efficient lookup and duplicate detection.

Each registered identity contains:

- `documentReference` — reference to the DID Document
- `controller` — address authorized to manage the DID
- `verificationKey` — public verification key represented by an address in this MVP
- `createdAt` — creation timestamp
- `updatedAt` — latest state-change timestamp
- `status` — `None`, `Active`, or `Revoked`

## Lifecycle

```text
Create
  ↓
Active
  ├── Update document reference
  ├── Rotate verification key
  ├── Change controller
  ↓
Revoked
```

A revoked DID remains resolvable so its lifecycle state can be verified, but active-only management operations are blocked.

## Key handling

Only the public verification address is stored by the contract. The corresponding private key must remain outside the blockchain and must never be sent to the contract.

Controller authorization is enforced by the contract for document updates, key rotation, controller changes, and revocation.

## Events

The contract emits events for:

- `DIDCreated`
- `DIDDocumentUpdated`
- `ControllerUpdated`
- `KeyRotated`
- `DIDRevoked`

These events provide the identity lifecycle trail needed by the TrustMesh audit layer.

## Recovery-ready design

Recovery is intentionally not implemented in this module. Controller authorization is isolated so a future guardian/recovery module can replace or extend controller recovery without changing the DID registry's core identity state.

## Test coverage

The included test suite covers:

- Creation and resolution
- Duplicate DID rejection
- Invalid creation input
- Authorized key rotation
- Unauthorized key rotation
- Document-reference updates
- Controller transfer
- Revocation lifecycle
- Unknown DID resolution
