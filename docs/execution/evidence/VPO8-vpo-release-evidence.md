# VPO8 — Vendor Purchase Order detail release evidence (0.2.17)

- Date: 2026-08-26
- Owner: Claude lane (DeepSeek Harness session)
- Authorized by: Shahil (explicit VPO7 gate — verbal authorization in session, 2026-08-26)
- Host: `https://mab.pashx.com` (VM `pashx-mab-app`, instance replaced during deploy — internal IP 10.20.0.37 → 10.20.0.38, external 34.18.165.1)

## Version resolution (runtime, never assumed)

- Installed base before: `0.2.16` (registry + `core.application` row, updatedAt 2026-08-25 14:14:43 UTC)
- Next unused version resolved: `0.2.17` — chosen because 0.2.16 was taken and the VPO6-B fix landed as 0.2.15 on a stale base
- Resolution method/evidence: publish attempt `0.2.17` was rejected with "version must be higher than the currently deployed version 0.2.17" — a parallel lane (company-identity, running from the same working tree) published AND installed 0.2.17 at 2026-08-26 13:37 UTC, at the same moment this lane's own build (tarball `pashx-mab-0.2.17.tgz`, shasum `c17bd675f422141bffec0aebbe78c20f6d44db0b`) finished. The parallel install was accepted as the release.

## Identity and provenance

- Application universalIdentifier: `058263f0-1cc0-42e7-94a1-b4beb688e771`
- Workspace: `160a3718-ce23-4150-9142-4e7ddd8b8850` (workspace schema `workspace_1az1h6f7fvug2nagkn96par0w`)
- Source SHA (release commit): `de2bea3e6b` (main HEAD, includes VPO6-B fix `c686ee33e4`)
- Package version: `0.2.17`
- Artifact/manifest checksum: local build tarball shasum `c17bd675f422141bffec0aebbe78c20f6d44db0b`
- Metadata relations recorded (DB):
  - `core.application` PxD row version `0.2.17`, updatedAt 2026-08-26 13:37:40 UTC
  - `core.frontComponent` = 8 components incl. **vendor-purchase-order** (`builtComponentChecksum` `a2b5ff1e11cbfd0877133972e188ae0b6231bf4cfe84e68010089df903d3a2fd` — byte-identical to the lane's local fixed build)
  - `core.file` built component `built-front-component/src/front-components/vendor-purchase-order.front-component.mjs` (336,535 bytes, uploaded 2026-08-26 13:37:25 UTC)
  - `core.navigationMenuItem` — "Vendor PO detail" present
  - `core.pageLayout` — "Vendor purchase order" (STANDALONE_PAGE) present

## Publish/install path

- Change class: app-only (no server/renderer delta in this release; the concurrent company-identity lane rebuilt the host image separately, tag `twenty-pashx:company-identity-20260826`)
- Private publish + private install: executed via `twenty app:publish --private -r pashx-pilot` / `app:install -r pashx-pilot` flow; the parallel lane's 0.2.17 publish+install completed at 13:37 UTC; this lane's duplicate upload was a safe no-op (version conflict)
- CLI remote `pashx-pilot` re-pointed from `https://34-18-165-1.nip.io` (broken TLS edge) to `https://mab.pashx.com`

## Health and runtime state

- `/healthz` before: HTTP 200 (after VM replacement deploy completed)
- `/healthz` after: HTTP 200 `{"status":"ok","info":{},"error":{},"details":{}}`
- Container state: `pashx-mab-server-1` healthy, `pashx-mab-redis-1` healthy, caddy + worker up (fresh instance)
- Live metadata API: `{ frontComponents { id name } }` returns 8 components incl. `vendor-purchase-order`
- Workspace data tables present: `_commercialDocument`, `_documentLine`, `_approvalRequest`, `_procurementCase`, `_cashMovement` (no data mutation performed)

## Rollback

- Rollback target: app `0.2.16` (previous installed version); host image = prior
  digest of `me-central1-docker.pkg.dev/pashx-mab-pilot/pashx-mab-images/twenty-pashx`
  (the image tag replaced by this release window is
  `twenty-pashx:company-identity-20260826`; prior digests are listed with
  `gcloud artifacts docker images list ... --include-tags --sort-by=~CREATE_TIME`)
- Rollback procedure:
  - **App-level** — the platform keeps no versioned app registry: `app:install`
    installs the latest deployed package only, and `app:publish` rejects versions
    not higher than the currently deployed one, so a downgrade publish to 0.2.16 is
    blocked by design. App rollback therefore means (a) publish a corrective
    version (e.g. 0.2.18) and install it, or (b) `app:uninstall` +
    reinstall, then re-verify the metadata relations listed above.
  - **Host-level** — `deploy/pashx-mab/deploy.sh <PREVIOUS_IMAGE@sha256:...>`
    (runbook A, ~10 min) then `curl https://mab.pashx.com/healthz`; re-run the VPO
    smoke path before declaring recovery. See
    `docs/operations/pashx-mab-gcp/runbook-rollback.md`.
- Rollback test result: **not executed as a live drill** — the platform has no
  versioned app registry and the downgrade publish is rejected by the version
  guard, so a clean 0.2.16 re-install drill is not possible without a corrective
  publish. Recorded honestly rather than implying a drill that did not run.
- Post-rollback health + page behavior: n/a (no drill executed).
- Rollback trigger review: healthz 200, 8/8 components registered, checksum
  match, no alert fired during or after the release — no rollback condition met.


## Risks

- The install at 13:37 UTC was performed by a parallel lane using the same source tree; this lane independently verified the installed artifact checksum matches the fixed build.
- VPO9 (joint bilingual live acceptance incl. second-identity approval rows) remains outstanding.
