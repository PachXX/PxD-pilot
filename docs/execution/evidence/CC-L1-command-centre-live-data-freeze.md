# CC-L1 — Command Centre live-data provenance freeze

Date: 2026-08-25  
Status: PASS — source lanes may begin  
Base: `03d391db609afc805b5fc1756d344df1acc1e40c`

## Accepted real inventory

The correction ledger and accepted import evidence establish the live demonstration inventory. The Command Centre must query it at runtime; these counts are acceptance evidence, not hard-coded UI values.

- 10 CR-backed Companies: 3 customers and 7 suppliers; imported by idempotent source-key/CR matching. Users were excluded.
- 3 real procurement cases: `MAB-META-MAB-PO-2026-4141`, `MAB-META-ASHM-004151-1`, and `MAB-META-SEN-EPO-2026-1102`.
- 8 source-backed commercial documents: 1 finalized vendor PO, 1 customer quote draft, 1 supplier RFQ draft, 1 customer PO draft, 3 finalized customer invoices, and 1 vendor quote draft.
- 0 accepted expenses, 0 cash movements, 0 pending approvals, and 0 active operational insights after disposable fixture cleanup.
- 0 verified document-line imports. Source document lines remain `Awaiting verification`.
- OCR and synchronized email intake are not accepted capabilities.

## Display-value provenance and gap matrix

| Displayed value | Authoritative source | Runtime rule / native evidence | Current accepted availability | Required gap state |
|---|---|---|---|---|
| Case identity | `procurementCase.id`, `name` | role-scoped case query; link `/object/procurementCase/{id}` | 3 real cases | Empty if none visible |
| Pipeline stage | `procurementCase.stage` | accepted seven-stage WP1 vocabulary; never inferred from documents and never default null to Intake | all three current imported cases have null stage | separate `Stage not recorded` bucket |
| Next task | `nextAction`, `actionDueAt`, `ownerId`, `blockerReason` | CC1 deterministic classification | available per record, possibly blank | `Not recorded` |
| Customer | `procurementCase.customerId` -> `company.id/name/commercialRegistrationNumber/vatRegistrationNumber` | derived-ID company query; native Company link | imported identities available when linked | `Not recorded`; never print UUID as name |
| Supplier | `commercialDocument.supplierId` -> same Company fields | visible-case docs, then derived-ID company query | DBMS identity verified; other linked suppliers where present | `Not recorded` |
| Compliance exception | document `complianceStatus`, `type`, `updatedAt` | one frozen CC1 predicate: `REJECTED` (and supported future `RETRYABLE_FAILURE`), not `PENDING` | derive dynamically; no fake count | zero state when none |
| Pending approval | `approvalRequest` with `status=PENDING` | role-scoped and case-scoped; native approval link | none after fixture cleanup | zero state; human-owned only |
| Evidence insight | active `operationalInsight`, source links | source-linked active records only; build link index from the whole bounded snapshot | none after fixture cleanup | unresolved source IDs remain plain text and make the evidence state partial |
| Document completeness | commercial documents grouped by visible case; `lifecycleStatus` | label as finalized documents / total; native document links; do not claim attachment evidence completeness | 8 real/source-backed docs | `Not recorded` only with no docs; attachment completeness `Unavailable` |
| Document amount | `totalAmountMicros`, `currency`, `lifecycleStatus` | display exact stored amount; financial totals count only accepted lifecycle/rules | 7 amount-bearing docs, mixed draft/finalized | `Awaiting finalization` for draft |
| Quotation invitations/responses | finalized supplier RFQ / finalized vendor quote under frozen QV rules | reuse QV deterministic model; no ranking for incomparable or draft-only offers | one draft RFQ + one draft quote; no comparable finalized set | `Awaiting finalized responses`; no recommendation |
| Quote commercial terms | `leadTimeDays`, `paymentTerms`, `validUntil` | only on source document that records them | queryable, may be absent | `Not recorded` |
| Delivery | case `deliveryStatus`, `deliveryDueAt` plus delivery-note evidence | stage-specific and source-linked | no accepted delivery evidence in 8-doc inventory | `Not recorded` |
| Invoice | finalized customer-invoice docs grouped by case | count and link to native documents | 3 finalized invoices | `Not recorded` where case has none |
| Verified cash movement | `cashMovement` with `verificationStatus=VERIFIED`, positive safe micros, source document/evidence ref | reuse the integrated UI6 source contract; live support begins only after a separately authorized release installs that source | zero real rows | current installed capability `Unavailable`; after release with no rows, `Not recorded`; never infer payment from invoice/PO |
| Cash inflow/outflow | verified cash direction and amount | sum only included cash movements | none | `Not recorded`, not zero collected/paid |
| Vendor risk | no accepted model or authoritative field | forbidden | unavailable | `Unavailable` |
| OCR extraction | no accepted provider/output | forbidden | unavailable | `Unavailable` |
| Email intake | no synchronized mailbox integration | forbidden | unavailable | `Unavailable` |
| Document line items | `documentLine` not verified/imported | forbidden until correction ledger verification | unavailable | `Awaiting verification` |
| Payment status | no accepted bank/payment evidence | forbidden to infer from PO/invoice status | unavailable | `Not recorded` |

## Deterministic precedence

The existing accepted ordering is unchanged:

1. `COMPLIANCE_EXCEPTION`
2. `APPROVAL_REQUIRED`
3. `BLOCKED_DATA`
4. `ACTION_REQUIRED`

Within priority, due timestamp ascends, then update timestamp descends, then stable identifier. Case operations rows follow that queue, then unqueued cases sort by updated timestamp and identifier. There is no AI-generated priority or ranking.

## Demo acceptance matrix

| Scenario | Expected result |
|---|---|
| Current real inventory | Three cases and eight documents are query-derived; UI contains no fixed business count or amount |
| Real case stage | Null stage is shown as `Stage not recorded`; a case enters RFQ Received/Intake only after that value is authoritatively recorded |
| Draft quotation evidence | Draft RFQ/quote are visible as incomplete evidence; no recommended vendor or savings is fabricated |
| No approval / no insight | Zero states are explicit and do not look like failed loading |
| No cash | `Not recorded`; profitability/invoice values are not relabelled as cash inflow |
| Partial connection | Visible data remains, partial banner names affected source, no hidden truncation |
| No permission | Neutral access-limited state; no raw GraphQL error or leaked record count |
| Loading/error/empty | Distinct, translated and screen-reader announced |
| Native drill-through | Case, company, document, approval, insight and cash links use Twenty native object routes in `_top` |
| Arabic | Arabic copy, `dir=rtl`, mirrored layout, unchanged identifiers and exact values |
| Keyboard/accessibility | semantic page heading; tables/labelled rows; logical focus; status text not colour-only; controls at least 44px |
| Native 200% | single-column reflow; no page-level horizontal scrolling or clipped action/evidence link |
| Console | no uncaught error or warning produced by Command Centre |

## Rollback and release gate

This freeze authorizes source and sandbox work only. The installed `0.2.14` remains the rollback target. No package-version bump, publish, install, deploy, live fixture, database write, or pilot API mutation is allowed. When CC-L3 passes, DeepSeek records `RELEASE_READY` and stops. Shahil must separately authorize release and the bounded live-QA matrix.

## Node record

```yaml
NODE: CC-L0/CC-L1
BASE_SHA: 03d391db609afc805b5fc1756d344df1acc1e40c
STATUS: PASS
COMMITS: []
FILES_CHANGED:
  - docs/execution/2026-08-25 - command-centre live-data harness graph.md
  - docs/execution/evidence/CC-L1-command-centre-live-data-freeze.md
TESTS:
  contract: 28/28_pass
  app: 127/127_pass
  lint: pass_0_findings
  typecheck: pass_after_required_sdk_declarations
  app_build: pass_26_files
  diff_check: pass
DATA_SOURCES:
  - CC1-source-metadata-audit.md
  - ADR-0003-command-centre-operational-control-plane.md
  - operational command-centre graph.md
  - OC6-A-command-centre-integration.md
  - OC6-A-DS6-live-qa.md
  - MI3-MI4-metadata-company-import-2026-08-24.md
  - MI5-document-correction-and-verified-import-2026-08-24.md
  - WP1-mab-workflow-pipeline.md
  - QV2-vendor-comparison-frozen-scope.md
  - QV9-bilingual-acceptance.md
  - UI6-verified-cash-flow.md
UNVERIFIED_EXCLUDED:
  - document_lines
  - OCR
  - email_intake
  - payment_status
  - vendor_risk
FIXTURES_CREATED: []
FIXTURES_CLEANED: []
LIVE_MUTATION: false
RISKS:
  - all current imported cases have no recorded stage and must not be defaulted to intake
  - draft-only quotation evidence cannot yield a recommendation
  - current cash state is not recorded
NEXT_OWNER: Codex_and_Claude_in_disjoint_CC-L2_lanes
```
