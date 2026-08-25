# UI6 — Verified cash inflow and outflow

Date: 2026-08-25

State: source complete; publish/install and live QA not authorized by this node.

## Outcome

The Operational profitability page now distinguishes finalized commercial-document value from actual cash movement. It does not infer payment from an invoice, purchase order, quotation, or expense.

The existing trend is renamed **Finalized document flow** and its period axis is sorted chronologically. A separate bilingual **Verified cash movement** panel reports:

- cash inflow;
- cash outflow;
- net cash;
- monthly cash trend and exact values;
- excluded cash-movement count; and
- an explicit `Not recorded` state when no verified payment evidence exists.

## Evidence contract

New `cashMovement` records contain direction, verification status, amount, movement date, procurement-case ID, source-document ID, bank reference, and evidence reference.

Only records satisfying every condition below enter cash totals:

1. `verificationStatus = VERIFIED`;
2. positive safe integer-micros amount;
3. valid ISO currency;
4. selected period and case dimensions;
5. existing procurement-case dimension;
6. source document ID present; and
7. non-empty evidence reference.

Pending/rejected or incomplete records are counted as exclusions. Currencies remain separated and are never converted.

## Permission boundary

- Admin and Finance: read/write cash movement records.
- Operator, Viewer, and Evidence Agent: read-only.
- Agent verification is forbidden by policy; a human controls `verificationStatus`.

No live cash movement was created. The current pilot has commercial-document evidence but no reviewed payment or bank evidence, so the correct live state after deployment is `Not recorded`, not SAR 0.

## Live data hygiene performed before source work

The role-visible pilot dataset was reduced to source-backed MAB evidence only. The cleanup removed 19 exact disposable/demo records through the PxD REST boundary:

- 10 legacy test/demo procurement cases;
- 7 test commercial documents;
- 1 demo expense; and
- 1 fictional demo customer.

Every deleted ID returned 404 afterward. Twenty soft-delete semantics make these records recoverable from trash/database until separately purged. The three source-backed MAB cases and eight real/source-backed commercial documents were preserved. No cash or payment amount was fabricated from those documents.

## Verification

- Contract: 26/26 tests, 100% lines/branches/functions.
- App: 117/117 tests.
- Contract lint: 0 warnings/errors.
- App lint: 0 warnings/errors.
- App typecheck: exit 0.
- `git diff --check`: clean.
- Official Twenty application build: succeeded, 24 files.

Regression coverage proves chronological month ordering, verified-only totals, pending/rejected exclusion, missing-evidence exclusion, dimension filtering, cash-only currency selection, and cash-only non-empty dashboard behavior.

## Release handoff

Branch: `codex/mab-cashflow`

Next owner: release lane. Rebase/merge after the active 0.2.14 lane settles, bump to the next non-conflicting app version, publish/install, verify the new `cashMovement` metadata relation, and perform bilingual/live/200%-zoom QA. Do not create cash records until Shahil supplies or approves actual payment evidence.
