# CC1 — Command Centre signal contract proposal

- Date: 2026-08-21
- Status: **approved by Shahil 2026-08-21; CC2 source-only implementation authorized**
- Standard: deterministic, workspace-scoped, evidence-linked, bilingual presentation

## Contract principles

1. A queue item represents one authoritative record and never copies editable business state.
2. Classification is deterministic. AI output cannot assign a signal.
3. Every item carries a stable reason code, evidence record link, observed timestamp, and data
   freshness timestamp.
4. Signals are not mutually exclusive in storage. Presentation uses the precedence
   `COMPLIANCE_EXCEPTION` → `BLOCKED_DATA` → `ACTION_REQUIRED` so one item is not repeated in the
   first viewport.
5. “Waiting” and “At risk” are not shipped as vague labels. They require an authoritative owner,
   deadline, or external dependency before they can be asserted.

## Proposed signal vocabulary

```ts
type CommandCentreSignal =
  | 'ACTION_REQUIRED'
  | 'BLOCKED_DATA'
  | 'COMPLIANCE_EXCEPTION';

type CommandCentreReasonCode =
  | 'CASE_CUSTOMER_MISSING'
  | 'CASE_PROJECT_MISSING'
  | 'CASE_OWNER_MISSING'
  | 'DRAFT_DOCUMENT_SUPPLIER_MISSING'
  | 'DRAFT_DOCUMENT_ISSUE_DATE_MISSING'
  | 'DRAFT_DOCUMENT_CURRENCY_MISSING'
  | 'DRAFT_DOCUMENT_REVIEW_REQUIRED'
  | 'EXPENSE_REVIEW_REQUIRED'
  | 'COMPLIANCE_REJECTED'
  | 'COMPLIANCE_RETRYABLE_FAILURE';
```

## Deterministic v1 rules

| Signal | Rule | Evidence | Permitted UI copy |
|---|---|---|---|
| `ACTION_REQUIRED` | Current user owns the case and it contains a draft commercial document whose required data is complete. | Case, document, owner ID, lifecycle status. | Review draft document |
| `ACTION_REQUIRED` | Current user owns the case and it contains a pending direct expense. | Case, expense, owner ID, approval status. | Review pending expense |
| `BLOCKED_DATA` | Case lacks customer, project, or owner. | Missing field plus case ID. | Add missing customer/project/owner |
| `BLOCKED_DATA` | Draft document lacks a type-required supplier, issue date, or valid currency. | Missing/invalid field plus document ID. | Complete document data |
| `COMPLIANCE_EXCEPTION` | A case document has rejected or retryable-failure compliance state. | Document ID, compliance status, update time. | Resolve compliance exception |

Rules are evaluated from authoritative stored values. A missing value is not guessed from names,
attachments, prior records, or free text.

## Minimal metadata extension requiring approval

The current fields can support the narrow rules above, but cannot truthfully show the approved
stage/deadline/age/next-action design. The smallest proposed extension to `procurementCase` is:

| Field | Type | Purpose |
|---|---|---|
| `stage` | select using existing `PASHX_PROCUREMENT_CASE_STAGES` | Authoritative chain position; server-command owned. |
| `nextActionCode` | select, allowlisted | Stable bilingual action label; never free-form UI inference. |
| `actionDueAt` | datetime, nullable | Enables overdue/age ordering; absence means no deadline claim. |
| `blockedReasonCode` | select, nullable | Explicit operational blocker not reducible to field validation. |

Existing `ownerRecordId` remains the responsible owner. Do not add a second action-owner field
until an observed workflow proves case ownership and action ownership must differ.

## Known gaps and exclusions

- The manifest currently maps compliance to `NOT_REQUIRED`, `PENDING`, `CLEARED`, and `REJECTED`.
  A distinct retryable-failure option must be approved before that reason is emitted from stored
  records; until then only rejected is a compliance exception.
- OCR human-confirmation review has no authoritative object/contract and is excluded from v1.
- Supplier silence, late delivery, and “waiting” cannot be inferred without recorded dependency and
  deadline data; they are excluded from v1.
- Stage transitions and queue-card actions are not part of this read-only contract.
- The supplied MAB metadata sheet and 17-file document packet contain missing references, compound
  PDFs, and filename/type mismatches. They are source evidence, not a runtime workflow database.
  See `CC1-source-metadata-audit.md`. CC2 does not infer queue truth from filenames or query the
  Google Sheet/local folder at runtime; source-file correction remains part of the separately
  scoped staged-import ledger.
- Queue ordering is compliance exceptions first, then blocked data, then actions; within a signal,
  overdue `actionDueAt` first, then oldest authoritative update timestamp, then stable record ID.

## Read-model envelope

```ts
type CommandCentreItem = {
  signal: CommandCentreSignal;
  reasonCode: CommandCentreReasonCode;
  recordType: 'procurementCase' | 'commercialDocument' | 'expense';
  recordId: string;
  procurementCaseId: string;
  caseName: string;
  customerRecordId: string | null;
  projectName: string | null;
  ownerRecordId: string | null;
  stage: string | null;
  nextActionCode: string | null;
  actionDueAt: string | null;
  observedAt: string;
  sourceUpdatedAt: string;
};
```

The endpoint must apply workspace isolation, capability checks, a fixed item limit, deterministic
ordering, and explicit partial-read reporting. The UI localizes codes; the server does not return
free-form explanatory prose.

## Acceptance matrix

- identical records produce identical signals and order;
- one record matching multiple signals appears once using documented precedence;
- another user's owned actions do not appear in “my action” results;
- missing data is enumerated with stable reason codes;
- rejected compliance outranks missing data and normal actions;
- unsupported compliance/OCR/waiting states are omitted, not guessed;
- item limit and partial-read state are visible;
- every item drill-through resolves to its authoritative record;
- English/Arabic labels preserve identifiers and dates correctly;
- keyboard, VoiceOver, 44px targets, and exact 200% zoom pass before deployment.

## Approval

Shahil approved all four items on 2026-08-21:

1. the three signal names and precedence;
2. the deterministic v1 rules and exclusions;
3. the four proposed case fields;
4. source-only CC2 work while deployment remains frozen.
