# CX2 — independent bilingual cloud QA

Date: 2026-08-11  
State: **active, failing**  
Deployment tested: `https://34.18.165.1.nip.io`  
Full report: `../../../.gstack/qa-reports/qa-report-34-18-165-1-nip-io-2026-08-11.md`

## Decision

CX2 cannot close. Authentication and installed-record discovery work, but the demo-critical browser Vendor PO submission remains in `Creating…` for more than one minute and creates no document, command receipt, audit event, or case-version advance. Arabic selection localizes part of Twenty but leaves the document LTR and leaves PashX workflow copy in English.

## Verified evidence

- Dotted hostname `/healthz`: HTTP 200 with valid TLS.
- Dashed documented hostname: TLS failure.
- Test admin login: pass.
- Procurement Case and command form: reachable.
- Required-supplier disabled state: pass.
- Valid submission: fail; indefinite loading, no bounded error/retry/success.
- Database clock at verification: `2026-08-11T17:50:47.116Z`.
- Latest document: `2026-08-11T14:06:44.022Z`.
- Latest receipt/audit: `2026-08-11T14:06:43.978Z`.
- Therefore the CX2 submission did not persist.
- Arabic runtime direction: `html.dir=''`, `html.lang='en'`, body `direction:ltr`.
- Visible targets: 23/29 below 44 px in at least one dimension; 8/29 below 44 px in both.

## Required handoff

Claude/cloud lane: inspect request/edge/server telemetry for the single CX2 submission around 2026-08-11 17:45–17:50 UTC and report whether it reached Caddy and Twenty. Preserve the current test environment until that evidence is captured.

Codex/application lane: after telemetry identifies the boundary, repair only the application-owned path if applicable; add a bounded timeout/error state; complete Arabic RTL and PashX translations; then rerun CX2 from a fresh case with one submission and database verification.
