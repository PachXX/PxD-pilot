# CC release — app 0.2.16 (evidence-led Command Centre overview)

- Date: 2026-08-25
- Coordinator: DeepSeek harness (release gate opened by Shahil)
- Live host: `https://34-18-165-1.nip.io`
- Result: **0.2.16 published and installed live; healthz 200; all pages present; data intact**

## Timeline

1. Overview UI merged into the shared branch (`7b4c88fd1a`), post-merge battery 134/134,
   lint 0/0, build 26 files, contract 100%.
2. Version bumped to 0.2.16 (`f9ae3462e3`).
3. `twenty app:publish --private -r pashx-pilot` — upload accepted, shasum
   `0e36b1fce3f2ad938b3ab2eb5372acc60b1ce7b7` (tarball `pashx-mab-0.2.16.tgz`).
4. `twenty app:install -r pashx-pilot` — the workspace reports
   `058263f0-1cc0-42e7-94a1-b4beb688e771@0.2.16 is already installed` (the parallel lane's
   release flow landed 0.2.16 concurrently). Either way, the installed version is 0.2.16.

## Live verification (2026-08-25)

- `/healthz` — HTTP 200.
- `pageLayouts`: Command centre, Case workflow, Vendor comparison, MAB workflow pipeline,
  Vendors — all STANDALONE_PAGE present.
- Record reads intact: 3 procurement cases, 8 documents, 2 decided approvals (no data
  mutations during the release).
- §10 predictions unchanged (band 0/0/3/0; stages vendor-order/invoicing/invoicing visible
  through the GraphQL UI path).

## Remaining release items (Claude lane)

- Host server redeploy carrying the current `twenty-server` module → adds the supplier-RFQ
  endpoint (acceptance recipe in `CC-release-gate-0-2-15.md`).
- §10 browser/operator QA of the evidence-led Command Centre (bilingual/RTL/a11y/200%,
  drill-through, overview panels with honest states).
- Rollback target: app 0.2.15 (previous installed version).
