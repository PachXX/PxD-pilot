# VPO8 — release evidence template (publish/install + health + rollback)

- Date: (filled at VPO8 execution)
- Owner: Claude lane
- Authorized by: Shahil (explicit VPO7 gate — this template must not be executed
  before that authorization is recorded)
- BASE_SHA: `03d391db609afc805b5fc1756d344df1acc1e40c`

> Placeholder fields only. Fill at VPO8 execution; never assume a version while
> other lanes are active.

## Version resolution (runtime, never assumed)

- Installed base before: `0.2.14`
- Next unused version resolved at runtime: (fill — do NOT assume `0.2.15` while
  codex/integration lanes are active)
- Resolution method/evidence: (fill — registry / installed-manifest query)

## Identity and provenance

- Application universalIdentifier: (fill)
- Workspace: (fill)
- Source SHA (release commit): (fill)
- Package version: (fill)
- Artifact/manifest checksum (shasum): (fill)
- Metadata relations recorded: (fill)

## Publish/install path

- Change class: app-only | server/renderer delta
- If app-only: private publish + private install record: (fill)
- If server/renderer delta: separate host-build/deploy authority: (fill)
  - Immutable image digest: (fill)
  - Active host digest before: (fill)
  - Active host digest after: (fill)
  - Rollback target (prior digest): (fill)

## Health and runtime state

- `/healthz` before: (fill)
- `/healthz` after: (fill)
- Container state before/after: (fill)
- Recent logs (no error/secret markers): (fill)

## Rollback

- Rollback target: (fill — prior app version and/or prior host digest)
- Rollback procedure: (fill)
- Rollback test result: (fill)
- Post-rollback health + page behavior: (fill)

## Immediate rollback conditions (any one triggers rollback)

1. Identity mismatch
2. Duplicate metadata
3. Unauthorized write
4. Amount mismatch
5. Broken idempotency / CAS / audit
6. Missing evidence
7. Persistent health failure
8. Secret exposure

## Verdict

- STATUS: PASS | REPAIR | BLOCKED
- RISKS: (fill)
- NEXT_OWNER: (DeepSeek | Codex | Claude | Shahil)
