# CC4 — Command Centre bilingual and accessibility acceptance

- Date: 2026-08-21
- Owner: Codex
- Outcome: **automated source acceptance passed; native runtime checks remain in CC5**

## Source acceptance passed

- Exhaustive English and Arabic copy for every signal, reason code, and Procurement Case stage.
- Semantic `lang` and `dir`, reactive host-locale reset, local language switch, Arabic font, and
  logical inline border behavior.
- Native headings, labelled regions, list semantics, polite status updates, and alert semantics.
- DOM-order keyboard flow with no positive `tabIndex`; visible 3px focus indication.
- Buttons and evidence links have at least 44px height.
- Responsive layouts at 900px and 560px, long identifier wrapping, and no fixed content width that
  requires horizontal scrolling at a 200% zoom-equivalent viewport.
- Explicit light/dark tokens and reduced-motion handling.
- Invalid upstream timestamps render as an em dash instead of crashing the page.

## Automated evidence

Five CC4 UI/model tests cover precedence, record links, invalid/Riyadh date formatting, bilingual
contract exhaustiveness, all runtime states, read-only source, native page metadata, keyboard/focus,
touch targets, RTL, dark mode, reduced motion, wrapping, and responsive breakpoints. The complete
application suite passes 31/31 and the official Twenty build passes.

## Honest residual runtime gate

Because the demo freeze is still active, this source packet has not been installed. CC5 must repeat
native Tab and VoiceOver observation, exact browser 200% zoom, English/Arabic RTL, all applicable
runtime states, evidence drill-through, and role-scoped data behavior after immutable deployment.
These manual checks are not claimed as passed by source inspection.

## CC5 live run — 2026-08-21

Against installed app `0.2.6`, the dedicated least-privilege operator authenticated successfully.
The Command Centre rendered 10 `BLOCKED_DATA`, 0 `COMPLIANCE_EXCEPTION`, and 0
`ACTION_REQUIRED` items. This is consistent with the signed-in operator owning no ready action;
the queue remained workspace-scoped and another owner's actions were not exposed.

Passed live:

- standalone navigation entry and Command Centre success state;
- loading state during refresh (`Refreshing…` / `جارٍ التحديث…`, disabled while busy);
- direct evidence drill-through to the authoritative Procurement Case;
- complete Arabic labels, Arabic counts/dates, and English restoration;
- accessible heading, region, list, button, link, alert/status structure in the native browser
  accessibility tree;
- no browser console warnings or errors;
- external `/healthz` HTTP 200;
- rollback evidence: app `0.2.5`; unchanged host digest
  `sha256:c48dd052dcf79ca6fa18cee90d47d66b10a16ab813688106650ee06b1e66156d`.

Not yet accepted physically:

- native macOS Tab traversal observation;
- VoiceOver spoken output;
- browser zoom indicator set to exactly 200% plus visual clipping/horizontal-scroll observation.

Automation exercised focusable controls and the source/automated responsive contract, but the
in-app browser surface did not expose reliable native browser chrome zoom or spoken VoiceOver
output. Error, partial, and empty live states were not fabricated by mutating pilot data or
disrupting the healthy service; their deterministic source tests remain green. CC5 therefore stays
open until Shahil performs the three physical observations above.
