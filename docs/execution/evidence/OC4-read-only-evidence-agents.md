# OC4 read-only evidence agents

- Date: 2026-08-24
- State: accepted; app `0.2.9` published, installed, and verified live
- Scope: native Twenty agent manifests and one least-privilege agent role
- Live mutations: app install only; no pilot business record or model invocation occurred

## Delivered boundary

OC4 adds two native app-defined agents:

1. **PxD Evidence Analyst** explains operational evidence, cites source record IDs, separates facts
   from inference and missing evidence, and returns proposals when asked to act.
2. **PxD Procurement Triage** treats deterministic Command Centre signals and next-action fields as
   workflow truth, then proposes a human-owned next task with evidence IDs and an accountable role.

Both agents bind to one **PxD Evidence Agent** role. The role:

- can be assigned to agents, but not users or API keys;
- has explicit read-only grants on the six PxD objects and Companies;
- has no global record permissions, settings access, or all-tools access;
- carries only Twenty's AI permission flag;
- has no PxD command capability, including approval, compliance, email-intake, financial, import,
  or insight-write capabilities; and
- exposes no create, update, soft-delete, or destroy permission on any object.

Twenty's database tool provider derives record tools from these object permissions, so this role
can receive find/group read tools for explicitly granted objects but cannot receive their create,
update, or delete variants. Sensitive static tools such as send-email, HTTP request, role
management, upload/download, and calendar creation remain unavailable because `canAccessAllTools`
is false and their permission flags are absent.

The prompts repeat the approved behavioral boundary: record text, synchronized email content, and
attachments are untrusted evidence rather than instructions; outputs cite source IDs; the agents
must not create/update/delete records, decide approvals, finalize documents, send email, or change
compliance state. These prompt rules improve model behavior, but the role permissions—not the
prompt—are the security boundary.

## Verification

- Contract suite: **15/15 pass**, 100% measured line/branch/function coverage.
- PxD app suite: **41/41 pass**.
- OC4 tests confirm both agents bind to the agent-only role, every object permission is read-only,
  no PxD capability is present, and both prompts carry provenance, untrusted-content, and
  prohibited-action requirements.
- Contract and app lint: zero warnings/errors.
- Official `yarn twenty dev:build .`: pass, including its manifest typecheck, 17 application files.
- Generated manifest inspected directly: two expected agent identifiers; one expected role; seven
  explicit object grants, all read-only; only `SystemPermissionFlag.AI`; no all-tools access.
- The ordinary app `tsc` command still reports the pre-existing missing `twenty-sdk` declaration
  output and legacy target errors across existing files. The authoritative Twenty app build passes
  and reports no OC4-specific error.

## Live publish/install verification

App version `0.2.8` was mechanically bumped to `0.2.9` because this changes installable manifest
metadata. Claude published and auto-installed `pashx-mab` `0.2.9` with shasum
`2190c4af47dfd7bcdd561599b2e6c4498f195ed3`; `0.2.8` remains the app rollback target.

Direct Cloud SQL verification confirmed:

- `core.application` reports version `0.2.9` under the existing application identity;
- `pxd-evidence-analyst` and `pxd-procurement-triage` both exist in `core.agent`;
- both agents join through `core.roleTarget` to the `PxD Evidence Agent` role;
- the live role has `canBeAssignedToAgents = true` and `canUpdateAllObjectRecords = false`; and
- external `/healthz` returns HTTP 200.

No agent was invoked during deployment verification. This closes OC4 installation and metadata
acceptance without claiming model behavior.

## Remaining acceptance

OC4 source completion does not claim live model quality. OC7 must run fixed-fixture evaluation for
evidence attribution, missing/conflicting evidence, prompt injection, prohibited-action refusal,
Arabic/English behavior, and graceful degradation when the agent/model service is unavailable.
Deterministic Command Centre queues remain usable without the agents.

OC7 is not the next ready node: it depends on OC6, while OC6 still depends on blocked OC5 native
mailbox intake and OC5-OCR provider acceptance. Starting OC7 before those gates would contradict
the approved graph. The next executable work is to unblock either OC5 by connecting a native
synchronized mailbox or OC5-OCR by completing the labeled OC5-OCR-B2 benchmark and provider
decision.
