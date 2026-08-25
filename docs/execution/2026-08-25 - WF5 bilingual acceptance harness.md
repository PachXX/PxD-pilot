# WF5 — end-to-end bilingual acceptance harness (Codex side)

- Date: 2026-08-25
- Coordinator: DeepSeek harness
- Source/harness owner: Codex (executed via DeepSeek)
- Live execution owner: Claude Code
- Product authority: Shahil (explicit fixture authority required before live creation)
- Status: **Codex side ready — matrix, fixture protocol, visual-parity checklist and live script committed; live execution is Claude's, gated on Shahil's fixture authority**
- Depends on: WF4 published/installed app `0.2.11` on the pilot host `https://34-18-165-1.nip.io`

## Scope

One disposable procurement case walks the complete MAB operating chain through the live REST
boundary of app `0.2.11`, the resulting state is accepted in both English and Arabic on the native
Command Centre and Case workflow pages, and every disposable record is deleted and verified absent.
Read-only bilingual display checks additionally use the verified MI5 evidence already in the pilot
workspace — never mixed with the disposable records.

## Fixture protocol (Codex-owned, enforced by the script)

- Every record name is prefixed `WF5-QA-<8-hex>` and labelled `disposable`; nothing else in the
  workspace is read for the chain walk.
- Created via the standard record REST boundary: `POST /rest/procurementCases`,
  `POST /rest/commercialDocuments`, `POST /rest/companies` (one disposable supplier).
- Chain walked exclusively through the WF2 command endpoints (transitions ×7, finalize ×7,
  delivery.record ×1) with the three human approval gates driven through
  `POST /rest/pashx-mab/approval-requests` + `.../decisions`.
- Cleanup deletes every document, the case, the supplier and the approval requests by captured
  UUID, then re-`GET`s each id and requires 404. The script exits 2 on any failure and prints the
  exact failing request.
- Execution is dry-run by default (`WF5_EXECUTE=1` required); the live run also requires Shahil's
  explicit fixture authority recorded in the evidence doc, mirroring DS6.

## Live script

`packages/twenty-server/test/integration/pashx-mab/wf5/wf5-live-acceptance.mjs`

```bash
WF5_BASE_URL=https://34-18-165-1.nip.io WF5_BEARER=<operator-or-admin-token> \
  node packages/twenty-server/test/integration/pashx-mab/wf5/wf5-live-acceptance.mjs
# plan mode: prints every request and the cleanup inventory, writes nothing.

WF5_BASE_URL=... WF5_BEARER=... WF5_EXECUTE=1 \
  node packages/twenty-server/test/integration/pashx-mab/wf5/wf5-live-acceptance.mjs
# execute mode (fixture authority required): walks the chain, verifies CLOSED at v8, cleans up,
# verifies 404 on every id.
```

Optional overrides: `WF5_APPROVER_MEMBER_ID` (defaults to the bearer's workspace member via
GraphQL `currentUser`), `WF5_PREFIX`.

## Live acceptance matrix (Claude executes; record result per row)

| # | Check | Method | Expected |
|---|---|---|---|
| 1 | Chain walk | WF5 script, execute mode | All commands 201; case CLOSED, `aggregateVersion` 8; two vendor quotations both finalized (price comparison shows both, finalized-first ranking) |
| 2 | Command Centre four-signal band | Browser, English | Compliance/Approvals/Blocked/Actions band renders in frozen precedence; disposable approval signals during the walk, zero after cleanup |
| 3 | Case workflow page — rail | Browser, English | Nine-stage rail with current marker; closed case shows closed as current |
| 4 | Case workflow page — documents ledger | Browser, English | All eight documents ordered by WF1 workflow step, native `/object/commercialDocument/…` links open the record page |
| 5 | Case workflow page — price comparison | Browser, English | Both vendor quotations listed, finalized first, totals in SAR, deterministic-note visible |
| 6 | Case workflow page — delivery + readiness | Browser, English | Delivery `Full` with due date; three readiness gates present; missing-gate states render honestly |
| 7 | Arabic / RTL | Browser, Arabic | `lang=ar`, `dir=rtl`, computed RTL; rail, ledger, comparison, delivery and readiness copy translate; shell remains English/LTR |
| 8 | Verified MAB evidence display | Browser, read-only | MI5-imported documents render with source links; no disposable prefix anywhere on the read path |
| 9 | Accessibility semantics | Accessibility tree | One H1, named regions, native tables, `aria-current` on the rail, 44px targets, focus order language → refresh → links |
| 10 | Refresh/loading/empty/partial/error | Browser | Refresh disables then re-enables with newer observed time; loading state on hard reload; empty state on an empty read; partial notice when bounded limit is exceeded (source-covered); error state source-covered |
| 11 | Console/runtime health | DevTools | Zero warnings/errors across navigation, drill-through, language switch, refresh |
| 12 | 200%-equivalent reflow | Half-width viewport | No horizontal overflow; rail scrolls without clipping; controls ≥44px |
| 13 | Cleanup verification | Script + SQL | Script reports 404s; SQL returns `remaining|0` for every disposable id; Command Centre returns to zero disposable signals |
| 14 | Manual native checks | Physical Mac | Native Tab focus and VoiceOver spoken output (manual residual, per DS6 precedent) |

## Visual-parity checklist (approved mockups → WF3 elements)

The approved mockup language (8 August PxD references + `DESIGN.md` Evidence Ledger + ADR-0002
process rail) was not available as files in the repo; per the 2026-08-24 decision WF3 built to
`DESIGN.md` + ADR-0002 and parity is verified here. For each row, record the human verdict
(match / diff) against the approved mockups once the live page is open.

| Mockup language element | WF3 element in source | Pass criteria |
|---|---|---|
| Restrained header with tenant brand, page purpose, observation time | `case-workflow.front-component.tsx` header + `as-of` line | Brand mark, title, subtitle, observed timestamp render once, no dashboard-card mosaic |
| Ruled band/strip composition (no floating cards) | `case-workflow.styles.ts` panels with 1px borders | Panels read as one ruled ledger; radii 4–6px; no shadows |
| Dense deterministic ledger with native links | Documents table + price comparison table | Column order matches; tabular figures for totals; ISO currency explicit; links native |
| Process rail (ADR-0002) | `buildCaseStageRail` → rail `ol` | Nine stages in frozen order; one current marker; cancelled marker red; `aria-current=step` |
| Delivery status with partial/full and due date | Delivery panel (`buildDeliveryState`) | Status chip, due date, finalized-note counts; no invented progress |
| Invoice readiness as derived evidence state | Readiness panel (`buildInvoiceReadiness`) | Three gates with present/missing states; explicit “derives from evidence” note |
| Evidence-linked drill-through everywhere | `/object/...` links with `target="_top"` | Every case/document/supplier reference is a working native link |
| Honest unavailable/partial states | Partial notice + empty/loading/error states | No simulated data; empty copy explains what is absent |
| Bilingual English/Arabic, RTL | `case-workflow.copy.ts`, `dir`/`lang` on root | Arabic meaning-matched (not transliterated); RTL mirrors layout; canonical values isolated |
| 44px targets, visible focus, 200%-zoom-safe | styles + component | Interactive targets ≥44px; focus outline visible; no content loss at reflow |

## Boundaries

- No agent may approve, finalize, record delivery, post invoices, change compliance state,
  send/delete email, or mutate accepted pilot evidence. The script mutates only records it created
  and labelled disposable.
- The live run does not start the pilot from scheduled-off state; if the VM is off, Claude follows
  the DS6 restart/restore precedent and records the workflow ids.
- Source repairs found during live execution return to Codex with evidence (failing request,
  response body); cloud/runtime repairs are Claude's.

## Exit condition

All matrix rows pass or are recorded as explicit manual residuals; the fixture inventory shows
deleted/verified-absent; the evidence doc is committed. **WF5 complete → pilot operating-workflow
acceptance closed; next workstream: quotation-vendor comparison (parallel graph).**
