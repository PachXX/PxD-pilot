# CC release gate — live verification of app 0.2.15

- Date: 2026-08-25
- Coordinator: DeepSeek harness
- Live host: `https://34-18-165-1.nip.io`
- Gate: **opened by Shahil 2026-08-25 ("approve publish/install of the next app version")**
- Result: **app 0.2.15 already deployed live (registry refuses duplicates — verified); server-side release gap found: the supplier-RFQ command is not yet on the live host**

## What the gate check established (read-only + validation-only probes)

1. **App 0.2.15 is the deployed version.** `twenty app:publish --private -r pashx-pilot`
   built `pashx-mab-0.2.15.tgz` (shasum `b8d5fda1bf473b66e93eba2e5db3e48c35c9433c`, 35 files) and
   the server registry refused the upload: *"version must be higher than the currently deployed
   version 0.2.15"*. The parallel lane released 0.2.15 ahead of this node; no duplicate publish
   is possible or needed.
2. **The deployed 0.2.15 metadata matches the shared branch.** Live `pageLayouts` contain:
   Command centre, Case workflow, Vendor comparison, MAB workflow pipeline, **Vendors** — the
   full shared-branch surface. `/healthz` 200.
3. **WF2 workflow commands are live on the host server** (validation-only probes, no writes):
   - `POST …/transitions` → `PASHX_INVALID_INPUT` with expected field paths ✓
   - `POST …/delivery` → `PASHX_INVALID_INPUT` with expected field paths ✓
   - `POST …/commercial-documents/:id/finalize` → `PASHX_INVALID_INPUT` with expected field
     paths ✓
4. **Release gap: `POST …/supplier-rfqs` returns the REST-core "Query path invalid" 400** —
   the supplier-RFQ controller is **not deployed on the live host's server**. App releases do
   not ship server code; the host image predates `pashx-supplier-rfq.controller.ts`.
   Consequence: until a host redeploy, the Vendors page RFQ request action will surface its
   error state (honest, but not functional). This is a **Claude-lane host redeploy item** —
   no source repair needed.
5. Data unchanged (3 cases, 8 documents, 25 companies, 0 pending approvals, 0 insights,
   0 expenses); the §10 predictions (0/0/3/0, profitability totals, RFQ-eligible 0) still hold.

## Open release items (Claude lane)

- Host server redeploy carrying the current `twenty-server` module (adds the supplier-RFQ
  endpoint). Verify with the validation-only probe pattern above.
- Browser QA per §10 (bilingual/RTL/a11y/200%, drill-through) — remains Claude-lane.
- The in-flight overview UI (lane worktree) is not part of 0.2.15; it will be its own release
  when it lands.
