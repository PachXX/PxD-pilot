# DeepSeek harness handoff — OC6-A core Command Centre integration

- Date: 2026-08-24
- Coordinator: DeepSeek harness
- Application/source owner: Codex
- Runtime/deployment/evidence owner: Claude
- Status: **DS0-DS5 complete; DS6 fixture-dependent matrix complete, two manual native checks remain**

## Mission

Close the smallest useful gap between the deployed three-signal Command Centre and the approved
operational graph. Extend the existing native Twenty page; do not create a second shell or rebuild
the page from scratch.

The first viewport must show:

1. one ruled signal band for compliance exceptions, pending approvals, blocked data and the current
   operator's actions;
2. one deterministic priority ledger ordered in exactly that precedence;
3. one narrow, read-only evidence-insights panel containing only active stored
   `operationalInsight` records, their generated timestamp/confidence and source-record links; and
4. honest unavailable states for synchronized email and OCR. Neither capability may be simulated
   or enabled while OC5 and OC5-OCR remain blocked.

## Authority order

1. `docs/execution/2026-08-21 - operational command-centre graph.md`
2. `docs/architecture/ADR-0003-command-centre-operational-control-plane.md`
3. `DESIGN.md` and the approved 8 August PxD mockup references
4. `CLAUDE.md`
5. `Pashx - MAB Agent Shared Context.md`
6. existing source and tests

If these disagree, stop at the smallest conflicting decision and record it. Do not silently pick a
new business rule.

## Execution graph

| Node | Owner | Depends on | Deliverable | Exit condition |
|---|---|---|---|---|
| **DS0** | DeepSeek | none | Restore context, inspect dirty worktree, claim OC6-A, publish file ownership. | No overlapping writes; exact baseline and blockers recorded. |
| **DS1** | DeepSeek + Codex | DS0 | Gap matrix between existing source, operational contracts and approved UI. | Every proposed UI value maps to an authoritative field or an explicit unavailable state. |
| **DS2** | Codex | DS1 | Extend the bounded loader/read model for pending approvals and active insights; compose the four-signal ledger and insight panel. | Contract, permission, partial/error and deterministic-order tests pass. |
| **DS3** | Codex | DS2 | English/Arabic UI, true RTL, evidence links, loading/empty/error/partial states, 44px targets and 200%-zoom-safe layout. | App tests, lint and official Twenty app build pass. |
| **DS4** | DeepSeek | DS2 + DS3 | Independent integration review and failure classification. | No fake metrics, invented links, optimistic mutations or graph violations; failures assigned to one owner. |
| **DS5** | Claude | DS4 | App-only immutable publish/install and live read-only verification. | **Complete 2026-08-24:** `0.2.10` published/installed, shasum recorded, `0.2.9` retained, health/logs/DB verified. |
| **DS6** | Codex + Claude | DS5 | Native browser acceptance and ledger closure. | **Fixture-dependent matrix complete 2026-08-24:** operator role, four-signal data, approval/insight/case drill-through, RTL, semantics, refresh/success/empty/partial, console and layout-equivalent reflow pass. Two approved disposable fixtures were deleted and verified absent. Physical Tab/VoiceOver and exact native 200% remain manual observations. Evidence: `docs/execution/evidence/OC6-A-DS6-live-qa.md`. |

DS2 and DS3 may iterate locally. DS5 must not begin merely because source tests pass.

## Agent assignments

### Codex

- Own only `packages/pashx-mab-contract`, `packages/twenty-apps/pashx-mab` and source evidence needed
  for the bounded application change.
- Reuse `buildOperationalWorkQueue`; do not duplicate precedence in JSX.
- Query only pending approval requests and active operational insights inside the existing bounded,
  workspace-scoped loader.
- Preserve read-only drill-through. Do not add approve/reject/cancel controls to the ledger in this
  node; OC3 commands remain the only transactional boundary.
- Add behavior tests before calling the source ready.

### Claude

- Own publish/install, Cloud SQL read-only verification, application health, logs, rollback evidence
  and live browser/runtime verification.
- Do not edit Codex-owned application files unless DeepSeek reassigns a specific failing repair
  node with evidence.
- Do not enable OCR, connect mailbox secrets, mutate Terraform or create live fixtures without the
  corresponding graph gate and user authority.

### DeepSeek harness

- Coordinate the graph, protect file ownership, compare evidence and assign the smallest repair.
- Never accept a subagent's “done” message as closure. Require command output, exact tests, version
  or digest where applicable, and updated evidence.
- Keep one node `in_progress` at a time per owner. Parallel work is allowed only for disjoint files
  and independent exit conditions.
- After each loop, append one shared-context entry: node, owner, changed files, commands, evidence,
  failures, next ready node and blockers.

## Loop engineering protocol

For every node run this loop:

1. **Observe:** read the graph, shared context, current diff, relevant tests and live evidence.
2. **Hypothesize:** state one smallest missing contract or failure mechanism.
3. **Assign:** send one bounded task with owned files, forbidden actions and exit command.
4. **Execute:** subagent changes only its assigned boundary.
5. **Verify:** run the narrow test first, then package suite, lint and official app build in that
   order. Claude performs runtime checks only after deployment is authorized.
6. **Classify:** pass, Codex application repair, Claude cloud/runtime repair, or user decision.
7. **Record:** update graph, evidence and shared context before opening the next node.

Maximum repair loops per unchanged failure: three. On the third identical failure, stop repeating
the same fix, preserve artifacts and escalate the root blocker.

## Hard stops

- Do not label or approve OC5-OCR-B2 ground truth; that remains Shahil's human-review task.
- Do not start B2-C or enable an OCR provider before the corpus is validated and frozen.
- Do not send/delete email, finalize financial documents, approve/reject on behalf of a human or
  change compliance state.
- Do not fabricate demo counts, insights, approvals, email candidates or source links.
- Do not publish, install, deploy or mutate live data from a source-only node.

## Source acceptance commands

Run the narrow affected tests first, then:

```bash
yarn workspace pashx-mab-contract test
yarn workspace pashx-mab test
yarn workspace pashx-mab lint
yarn workspace pashx-mab twenty dev:build .
```

Record any broader monorepo failure separately from a PashX-scoped regression.
