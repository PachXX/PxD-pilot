# PxD MAB client demo readiness — 2026-08-20

## Status

- Demo environment: **frozen for rehearsal**; no feature development until the client demo ends.
- PxD application: `0.2.5`, verified in `core.application` for workspace
  `160a3718-ce23-4150-9142-4e7ddd8b8850`.
- Running host image:
  `sha256:c48dd052dcf79ca6fa18cee90d47d66b10a16ab813688106650ee06b1e66156d`.
- Host rollback image:
  `sha256:57f0f9b95e64c1f7d9d5465207a255cf04c6cc3ba2e78707f6dd423703f6bf73`.
- Current app manifest SHA-256:
  `715ae676953737e8a0d1b16e1b0b5d74a1778d8c5b2b9902b98d08595fca3928`.
- Current app tarball SHA-256:
  `5abd755f2d3026b72cf7988db2a9b775f9c3e87d4aaf3298153da2a44178af87`.
- Latest health check: HTTP 200; app container healthy; Cloud SQL `RUNNABLE`, private-IP only.
- Dashboard route:
  `https://34-18-165-1.nip.io/page/19f450f5-056b-40e3-a797-5bf1367bc717`.

## Retained sanitized demo dataset

Every retained record begins with `PXD-DEMO-20260820`. Names and amounts are fictional. These
records are presentation data and must never be represented as accepted MAB evidence.

| Record | ID | Demo value |
|---|---|---|
| Customer company | `0d99a853-b079-43f9-8391-72031b2d5187` | Al Noor Interiors (Fictional) |
| Supplier company | `dda24d8d-f248-41c2-bd73-3f074fdd67dd` | Gulf Office Supplies (Fictional) |
| Procurement case | `007b7cf0-a93a-4098-b689-0a98be6185cb` | Riyadh HQ Fit-Out |
| Finalized customer invoice | `3ebdb1ee-3391-4a37-85a9-7ed8cd819d6b` | SAR 125,000.00 |
| Finalized vendor PO | `05f1cbdf-9098-43c8-acd8-8bc470aec2e8` | SAR 82,500.00 |
| Approved direct expense | `87c85964-b900-41b2-a330-d1777ab077ae` | SAR 7,500.00 |
| Excluded command-created Vendor PO | `22753918-f57c-41d9-a688-2529a4b48cbb` | `MAB-VPO-2026-0061`; draft; amount not yet entered |

The initially hand-seeded draft invoice `1cfdca57-d81d-4bc9-90cb-ad4bccbac4a6` was soft-deleted
after the real operator command succeeded. This leaves exactly one retained demo exclusion created
through the actual Vendor PO workflow.

Expected dashboard result:

- finalized revenue: SAR 125,000.00;
- direct cost: SAR 90,000.00;
- gross profit: SAR 35,000.00;
- gross margin: 28.00%;
- included records: 3;
- excluded draft records: 5, comprising the retained demo draft plus four pre-existing pilot
  drafts. The UI correctly reports all five rather than hiding the pre-existing exclusions.

Live acceptance passed in English LTR and Arabic RTL with exact totals, no horizontal overflow,
and working evidence drill-through. The vendor PO link opens record
`05f1cbdf-9098-43c8-acd8-8bc470aec2e8` and displays Finalized, SAR 82.5k, supplier ID, case ID,
issue date, and provenance.

## Five-minute client flow

### 0:00–0:30 — PxD identity

Open PxD and say: “This is the MAB procurement pilot running as PxD. Today we will show one
traceable procurement decision, not a generic CRM tour.” Point out the PxD browser title and
Operational profitability navigation item.

### 0:30–1:45 — trustworthy profitability

Open Operational profitability. Explain:

- SAR 125,000 finalized revenue comes from the retained fictional customer invoice;
- SAR 90,000 direct cost is the SAR 82,500 finalized Vendor PO plus SAR 7,500 approved expense;
- the deterministic result is SAR 35,000 gross profit and 28.00% gross margin;
- currencies are not converted or combined.

### 1:45–2:30 — exclusions and evidence

Show the partial-evidence notice and Evidence coverage. Say: “PxD does not silently turn drafts
into financial totals. Five drafts are visible as exclusions and every exclusion remains counted.”
Open `PXD-DEMO-20260820-VENDOR-PO-001` from the contributing-record ledger to prove traceability,
then return to the dashboard.

### 2:30–3:10 — Arabic RTL

Select Arabic. Point out that the dashboard, filters, values, evidence warning, and analysis panels
switch to semantic RTL while financial identifiers remain isolated and readable. Switch back to
English before the command flow if the operator prefers English.

### 3:10–4:35 — Vendor PO command

Sign in as the dedicated `pashx-operator@pashx-mab.invalid` operator; its password remains in Secret
Manager as `pashx-mab-pilot-operator-password` and must not be copied into this document. Open the
retained case, invoke **Create vendor purchase order**, select the fictional Gulf Office Supplies
supplier, retain SAR and the issue date, and use a clearly labelled demo reference.

The Shahil pilot Admin identity intentionally does not carry `pashx.procurement.issue`; the live
rehearsal correctly returned “Your role does not allow this action.” Do not grant the built-in Admin
role extra application capabilities merely for convenience. Use the already-provisioned
least-privilege operator identity.

The 20 August rehearsal succeeded on the first bounded submission and created
`MAB-VPO-2026-0061`; therefore no Retry control was presented. If a genuine retryable failure is
present during the meeting, keep the form values unchanged and use **Retry creation** once. Do not
create repeated successful drafts merely to simulate failure. Accepted CX2-R remains the
authoritative unchanged-retry proof.

### 4:35–5:00 — stored result and close

Open the resulting commercial document and show its number, supplier, case, issue date, lifecycle,
and created/updated provenance. Close with: “The visible number is backed by one document, one
receipt, one audit event, one allocation, and one case-version increment; retries do not duplicate
the business action.”

## Ten-minute manual UI5 sign-off

These checks require Shahil at the physical browser and are not replaced by DOM automation.

1. Tab from the language action through Refresh, start/end dates, Case, Customer, Project, Owner,
   Currency, contribution links, evidence links, and records. Record whether order is logical and
   every focused element has a visible outline.
2. Enable VoiceOver. Confirm the page heading, dashboard label, filter region and labels, partial
   evidence status, KPI contribution links, section headings, evidence table, and drill-through
   links are announced meaningfully in English and Arabic.
3. Set browser zoom to exactly 200%. At both English LTR and Arabic RTL, confirm no text, controls,
   financial values, warnings, links, or tables are clipped and there is no page-level horizontal
   scrolling.

Record each as Pass or Fail in the shared context. Any failure reopens UI5; otherwise UI5-T7 closes.

## Pre-meeting check and freeze

Run immediately before screen sharing:

```bash
curl -fsS https://34-18-165-1.nip.io/healthz
gcloud sql instances describe pashx-mab-pg \
  --project=pashx-mab-pilot \
  --format='value(state,settings.ipConfiguration.ipv4Enabled)'
```

Expected: health JSON with `status: ok`; Cloud SQL `RUNNABLE` and `False` for public IPv4.

Freeze rules:

- no app publish/install, host deployment, Terraform apply, schema change, package upgrade, or demo
  data cleanup before the meeting without an explicit go/no-go decision;
- keep the current host digest and app `0.2.5` pinned;
- if the app becomes unhealthy and no migration ran, follow rollback procedure A in
  `docs/operations/pashx-mab-gcp/runbook-rollback.md` using the recorded rollback digest;
- preserve the two fallback screenshots in `docs/execution/evidence/demo-runtime/`;
- after the demo, decide explicitly whether to retain or delete every `PXD-DEMO-20260820` record.

## Fallback evidence

- `docs/execution/evidence/demo-runtime/2026-08-20-operational-profitability-english.png`
- `docs/execution/evidence/demo-runtime/2026-08-20-operational-profitability-arabic.png`

## Rehearsal result

Shahil gave action-time confirmation for the Secret Manager credential. Codex authenticated as
`pashx-operator@pashx-mab.invalid`, completed its previously-unfinished minimal profile as
`PashX Operator / Procurement Operator`, and left the browser signed in under that least-privilege
identity. The first bounded submission succeeded with `MAB-VPO-2026-0061 created as a draft.`

Cloud SQL evidence for case `007b7cf0-a93a-4098-b689-0a98be6185cb` passed:

| Invariant | Evidence | Result |
|---|---:|---|
| Stored document | `22753918-f57c-41d9-a688-2529a4b48cbb`; `VENDOR_PURCHASE_ORDER / DRAFT / SAR` | pass |
| Supplier relation | `dda24d8d-f248-41c2-bd73-3f074fdd67dd` | pass |
| Procurement-case version | `aggregateVersion = 1` | pass |
| Command receipts for case | `1`, aggregate version `1` | pass |
| Audit events for case | `1`, aggregate version `1` | pass |
| Number allocation | `vendorPurchaseOrder / 2026 = 61` | pass |

No retry was attempted because the successful first submission closed the form and presented no
retry state. Creating another successful command would not test idempotency and would pollute the
demo. CX2-R's accepted unchanged-retry evidence remains authoritative.

The only open UI5-T7 work is the physical native Tab, VoiceOver, and exact 200% zoom observation in
the checklist above.
