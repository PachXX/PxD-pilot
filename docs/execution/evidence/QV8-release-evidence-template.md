# QV8 — release evidence template (publish/install + live QA)

- Date: (filled at QV8 execution)
- Owner: Claude lane
- Authorized by: Shahil (explicit QV7 gate — this template must not be executed
  before that authorization is recorded)
- BASE_SHA: `26d55fde1a85a4a24f35898bc751a62832c04fcc`

## Publish/install record

- Application identity: PxD (unchanged)
- Version before: `0.2.10`
- Version after: (exact bump at publish time)
- Manifest shasum: (record)
- Host digest: (record)
- `/healthz`: HTTP (record) `{"status":"ok"}`
- Rollback target: `0.2.10`

## Fail-closed verification (no live mutation)

The four WF2 REST endpoints must fail closed for viewer/evidence-agent principals
(no PashX role) with no live-data mutation:

- `POST /rest/pashx-mab/procurement-cases/:id/transitions`
- `POST /rest/pashx-mab/commercial-documents/:id/finalize`
- `POST /rest/pashx-mab/commercial-documents/:id/cancel`
- `POST /rest/pashx-mab/procurement-cases/:id/delivery`

Expected per principal: typed forbidden/error response, zero rows written.
Record actual status codes per endpoint and per principal.

## Vendor-comparison page live checks

- Page renders for a case with verified MI5/WF evidence; comparison table,
  summary signals and deterministic recommendation match the frozen QV2
  contract.
- No-permission/empty state copy stays honest; drill-through targets native
  records.
- English/Arabic + RTL spot check; keyboard operation; 44px targets.

## Disposable fixture cleanup

- Fixture IDs created: (list)
- Deleted by captured ID: (list)
- Absence verified: (queries)
- Pilot data untouched: (evidence)

## Rollback evidence

- Rollback procedure: (reference runbook)
- Rollback test result: (record)
- Post-rollback `/healthz` and page behavior: (record)

## Live QA verdict

- STATUS: PASS | REPAIR | BLOCKED
- RISKS: (bounded list)
- NEXT_OWNER: (DeepSeek | Shahil)
