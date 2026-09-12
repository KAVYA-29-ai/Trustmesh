from app.db.models import Identity, Organization, Permission, Resource, Role
from app.db.session import SessionLocal

ORG_ID = "org-trustmesh"


def seed() -> None:
    with SessionLocal() as db:
        if db.get(Organization, ORG_ID) is None:
            db.add(
                Organization(
                    id=ORG_ID,
                    name="TrustMesh Organization",
                )
            )
            db.flush()

        permissions = {
            "perm-identity-read": ("identity:read", "View verified identities"),
            "perm-policy-manage": ("policy:manage", "Manage access policies"),
            "perm-resource-read": ("resource:read", "Read protected resources"),
            "perm-asset-manage": ("asset:manage", "Manage digital assets"),
            "perm-audit-read": ("audit:read", "View immutable audit records"),
            "perm-security-read": ("security:read", "View security findings"),
        }

        for permission_id, (name, description) in permissions.items():
            if db.get(Permission, permission_id) is None:
                db.add(
                    Permission(
                        id=permission_id,
                        organization_id=ORG_ID,
                        name=name,
                        description=description,
                    )
                )

        roles = {
            "role-admin": ("Administrator", "Full TrustMesh administration"),
            "role-security": (
                "Security Analyst",
                "Security monitoring and audit access",
            ),
            "role-asset": (
                "Asset Manager",
                "Digital asset management",
            ),
        }

        for role_id, (name, description) in roles.items():
            if db.get(Role, role_id) is None:
                db.add(
                    Role(
                        id=role_id,
                        organization_id=ORG_ID,
                        name=name,
                        description=description,
                    )
                )

        identities = {
            "identity-admin": (
                "0x0000000000000000000000000000000000000001",
                "did:trustmesh:admin",
            ),
            "identity-security": (
                "0x0000000000000000000000000000000000000002",
                "did:trustmesh:security",
            ),
            "identity-asset": (
                "0x0000000000000000000000000000000000000003",
                "did:trustmesh:asset",
            ),
        }

        for identity_id, (wallet_address, did) in identities.items():
            if db.get(Identity, identity_id) is None:
                db.add(
                    Identity(
                        id=identity_id,
                        organization_id=ORG_ID,
                        wallet_address=wallet_address,
                        did=did,
                        active=True,
                    )
                )

        resources = [
            (
                "res-admin-console",
                "Admin Console",
                "Application",
                "trustmesh://admin-console",
                {"application": "TrustMesh Console", "access_level": "Administrator"},
            ),
            (
                "res-security-center",
                "Security Center",
                "Application",
                "trustmesh://security-center",
                {"application": "TrustMesh Console", "access_level": "Security Analyst"},
            ),
            (
                "res-audit-log",
                "Audit Log",
                "Data",
                "trustmesh://audit-log",
                {"application": "TrustMesh Console", "access_level": "Security Analyst"},
            ),
            (
                "res-digital-assets",
                "Digital Assets",
                "Asset",
                "trustmesh://digital-assets",
                {"application": "TrustMesh Platform", "access_level": "Asset Manager"},
            ),
        ]

        for resource_id, name, resource_type, identifier, metadata in resources:
            if db.get(Resource, resource_id) is None:
                db.add(
                    Resource(
                        id=resource_id,
                        organization_id=ORG_ID,
                        name=name,
                        resource_type=resource_type,
                        identifier=identifier,
                        metadata_json=metadata,
                    )
                )

        db.commit()

        print("TrustMesh database seed completed.")
        print(f"Organization: {ORG_ID}")
        print(f"Identities: {len(identities)}")
        print(f"Roles: {len(roles)}")
        print(f"Permissions: {len(permissions)}")
        print(f"Resources: {len(resources)}")


if __name__ == "__main__":
    seed()
