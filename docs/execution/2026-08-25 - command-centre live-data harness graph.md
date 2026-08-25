# PxD MAB Command Centre — live-data harness graph

Date: 2026-08-25  
Coordinator: DeepSeek Harness  
Frozen base: `03d391db609afc805b5fc1756d344df1acc1e40c`  
Release boundary: source and sandbox only; publish, install, deploy, and live-data mutation are forbidden until Shahil gives separate release authority.

## Objective

Make the native Command Centre a trustworthy MAB operating surface over the data that is already authoritative. It must show real procurement cases, the accepted seven-stage pipeline, deterministic next work, human approvals, compliance exceptions, evidence-linked insights, document completeness, customer and supplier identity, quotation signals, delivery and invoice state, and verified cash movement when it exists. Missing or unverified capability remains visible as `Not recorded`, `Unavailable`, or `Awaiting verification`; the UI never fills a gap by inference.

## Frozen prerequisites

| Property | Frozen value |
|---|---|
| `BASE_SHA` | `03d391db609afc805b5fc1756d344df1acc1e40c` |
| Base branch/worktree | `deepseek/vpo-base` / `twenty-vpo-base-tmp` |
| Integration lane | `deepseek/cc-live-integration` / `twenty-cc-live-integration` |
| Codex lane | `deepseek/cc-live-codex` / `twenty-cc-live-codex` |
| Claude lane | `deepseek/cc-live-claude` / `twenty-cc-live-claude` |
| Primary checkout | Dirty; read-only for this track |
| Baseline gates | contract 28/28; app 127/127; lint 0/0; typecheck pass; app build 26 files; `git diff --check` clean |
| Installed baseline | app `0.2.14`; no change authorized in this graph |

## Executable DAG

```text
CC-L0 Freeze base and authoritative inventory [DeepSeek, read-only]
  |
CC-L1 Freeze field provenance, exclusions, UI and QA contract [DeepSeek, docs]
  |\
  | +--> CC-L2-C Build bounded read model and native Evidence Ledger UI [Codex lane]
  |       |
  |       +--> C review loop: tests -> self-review -> repair (maximum 3 identical failures)
  |
  +----> CC-L2-A Build independent provenance/permission/sandbox QA harness [Claude lane]
          |
          +--> A review loop: negative tests -> provenance review -> repair (maximum 3 identical failures)
                   \
                    +--> CC-L3 Integrate reviewed commits only [DeepSeek lane]
                           |
                           +--> full source gates + sandbox matrix + diff review
                                   |
                                   +--> PASS: record RELEASE_READY, stop
                                   +--> FAIL: assign smallest repair, maximum 3 same failures
                                   +--> third same failure: BLOCKED with test and owner

Separate authority only:
RELEASE_READY --Shahil explicit release approval--> publish/install/live QA/rollback evidence
```

Nodes may run in parallel only when their file ownership is disjoint. No lane may mutate the pilot workspace, publish an app, install an app, deploy infrastructure, or create live fixtures.

## Ownership and artifacts

| Node | Owner | Write boundary | Required output |
|---|---|---|---|
| CC-L0 | DeepSeek | read-only | clean SHA, baseline gates, accepted evidence inventory |
| CC-L1 | DeepSeek | this graph + evidence freeze | provenance matrix, UI contract, machine handoff |
| CC-L2-C | Codex | `src/command-centre/**`, Command Centre front component, Command Centre source tests | one bounded loader, deterministic model, bilingual native UI, source test evidence, one commit |
| CC-L2-A | Claude | new Command Centre sandbox/provenance harness and evidence template only | independent provenance, permission, negative-state and cleanup assertions, one commit |
| CC-L3 | DeepSeek | integration branch only | reviewed cherry-picks, test report, repair verdict, shared-context handoff |

Codex does not edit deployment, versioning, evidence, Terraform, or Claude-owned harness files. Claude does not edit Codex-owned feature files unless DeepSeek explicitly reassigns a smallest failing repair. DeepSeek does not hand-edit either implementation lane while it is active.

## Read-model contract

The page uses one bounded, role-scoped loader. It first loads visible cases and the current member, derives the visible case identifiers, then server-filters dependent reads to those identifiers wherever the API supports it. Companies are loaded only for customer/supplier identifiers derived from visible records. A defensive in-memory scope check remains mandatory. Pagination or any failed optional read produces a partial state; it never silently truncates.

The loader has these bounded projections:

1. visible cases and current-member identity;
2. dependent commercial documents, expenses, approvals, insights, and cash movements limited to visible cases/source identifiers;
3. customer and supplier companies limited to referenced identifiers;
4. deterministic case rows plus the existing precedence queue;
5. explicit capability-state records for evidence that does not exist.

No inference may advance `procurementCase.stage`. Documents are supporting evidence, not a second workflow state machine.

## First viewport

The accepted Evidence Ledger visual language remains in force: ruled sections, restrained status colour, dense evidence-first rows, no decorative card mosaic.

1. Page title, observed timestamp and `Partial evidence` banner when needed.
2. Four-signal band in frozen precedence order: compliance, approval, blocked data, action required.
3. Seven-stage MAB pipeline strip using authoritative `procurementCase.stage` counts only, plus a separate `Stage not recorded` count. A null stage must never be placed into RFQ Received/Intake.
4. Main operating ledger, ordered by deterministic priority, containing:
   - case and native case link;
   - customer identity and native company link when recorded;
   - current stage, next task, due/overdue state and owner;
   - finalized/total document completeness;
   - supplier/quotation comparison state without synthetic ranking;
   - delivery and invoice state;
   - verified cash state or `Not recorded`;
   - native source-document links.
5. Narrow evidence rail for pending human approvals, active evidence-linked insights, and capability gaps.

At native 200% zoom the layout reflows to one column without page-level horizontal scrolling. A dense table may become structured labelled rows; information may not disappear.

## Loop gates

### Plan gate

- exact `BASE_SHA` and clean lane;
- no overlapping file ownership;
- every proposed value mapped to an accepted field/query;
- every absent or unverified value assigned an honest display state.

### Implement gate

- one bounded loader;
- deterministic precedence and stable tie-breaking;
- no fetch mutation, no commands, no fixtures;
- native `_top` drill-through links;
- EN/AR true RTL copy and layout;
- loading, empty, partial, error, and no-permission states.

### Review gate

- independent provenance check catches any field without a source;
- role scope and cross-case leakage fail closed;
- no raw identity UUID displayed as a person/company name;
- draft or unverified documents never count as finalized financial evidence;
- the compliance predicate is shared with accepted CC1 semantics; `PENDING` review is not presented as a compliance exception;
- zero-value, absent and unavailable states are distinguishable.

### QA gate

- contract and app suites green;
- lint, typecheck, app build and whitespace check green;
- accessibility/source assertions cover semantic headings/tables/status, logical keyboard order, 44px targets and RTL;
- sandbox covers loading, empty, partial, error, no-permission, no-real-cash, single-draft-quote/no-ranking and stage-not-inferred states;
- no console error in local runtime if a runtime is available;
- all sandbox fixtures inventoried and removed.

## Test commands

Run from an isolated lane after its dependencies are built:

```bash
yarn workspace pashx-mab-contract test
yarn workspace pashx-mab test
yarn workspace pashx-mab lint
yarn workspace pashx-mab typecheck
yarn workspace pashx-mab twenty dev:build .
git diff --check
```

Fresh worktrees must first build the existing contract/shared/client/sdk declaration chain recorded in `QV3-C-vendor-comparison-source.md`; generated `dist/` output is ignored and is not an implementation change.

## Stop conditions

- Stop immediately if the selected base is dirty, the branch moved, ownership overlaps, or an input lacks accepted provenance.
- Stop before any publish, install, deploy, API mutation, database mutation, or live fixture creation.
- One failing gate returns to the smallest owning node. The same failure may loop at most three times; the third result is `BLOCKED`, with the exact failing test and owner recorded.
- Source and sandbox success produces `RELEASE_READY`, not `COMPLETE`. A separate explicit Shahil authorization is required for release and live QA.

## Machine-readable handoff

```yaml
track: CC-L
base_sha: 03d391db609afc805b5fc1756d344df1acc1e40c
mode: source-and-sandbox-only
live_mutation: forbidden
release_authority_required: Shahil
nodes:
  - id: CC-L0
    owner: deepseek
    depends_on: []
    status: pass
  - id: CC-L1
    owner: deepseek
    depends_on: [CC-L0]
    status: pass
  - id: CC-L2-C
    owner: codex
    depends_on: [CC-L1]
    worktree: /Users/pxd/PycharmProjects/ hallo world/twenty-cc-live-codex
    branch: deepseek/cc-live-codex
    output: reviewed_single_commit
  - id: CC-L2-A
    owner: claude
    depends_on: [CC-L1]
    worktree: /Users/pxd/PycharmProjects/ hallo world/twenty-cc-live-claude
    branch: deepseek/cc-live-claude
    output: reviewed_single_commit
  - id: CC-L3
    owner: deepseek
    depends_on: [CC-L2-C, CC-L2-A]
    worktree: /Users/pxd/PycharmProjects/ hallo world/twenty-cc-live-integration
    branch: deepseek/cc-live-integration
    output: release_ready_or_blocked
retry_policy:
  same_failure_max: 3
  terminal_state: blocked
required_states: [loading, empty, partial, error, no_permission]
required_locales: [en_ltr, ar_rtl]
forbidden_inference:
  - case_stage_from_documents
  - quotation_ranking_without_comparable_finalized_quotes
  - cash_or_payment_without_verified_cash_movement
  - risk_without_accepted_risk_model
  - ocr_or_email_without_accepted_integration
```
