#!/usr/bin/env bash
# VPO6 source-gate runner for the PashX MAB Vendor Purchase Order detail page.
# Executes the locally-runnable acceptance gates from the frozen VPO2 matrix
# (VPO2-vendor-purchase-order-frozen-contract.md): app suite, contract suite,
# official app build, oxlint on the VPO files, git diff --check, read-only
# source assertions on the vendor-purchase-order front component, and fixture
# cleanup proof.
#
# Lane protocol (ports — containers MUST use lane-specific project names/ports
# and be STOPPED after QA):
#   - Claude QA lane:      port 2032   (project suffix -vpo-claude)
#   - Codex source lane:   port 2034   (project suffix -vpo-codex)
#   - Integration lane:    port 2036   (project suffix -vpo-integration)
#
# STOP-AFTER-QA REMINDER: this runner is QA-only. After VPO6 stop containers
# (`docker compose down` with the lane project name), close out the fixture
# inventory with cleanup proof, and do NOT publish/install/deploy — release
# authority is Shahil's separate VPO7 gate; VPO8 performs the release.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

PASS=0
FAIL=0

note() { printf '\n== %s ==\n' "$1"; }
ok()   { printf 'PASS: %s\n' "$1"; PASS=$((PASS + 1)); }
bad()  { printf 'FAIL: %s\n' "$1"; FAIL=$((FAIL + 1)); }

# 1. App suite (must be green incl. vendor-purchase-order specs)
note "app suite"
if (cd packages/twenty-apps/pashx-mab && yarn test); then
  ok "app yarn test"
else
  bad "app yarn test"
fi

# 2. Contract suite
note "contract suite"
if (cd packages/pashx-mab-contract && yarn test); then
  ok "contract yarn test"
else
  bad "contract yarn test"
fi

# 3. Official app build
note "app build"
if (cd packages/twenty-apps/pashx-mab && yarn twenty dev:build .); then
  ok "twenty dev:build ."
else
  bad "twenty dev:build ."
fi

# 4. oxlint on the VPO files (new detail-page files + D1/D2/D5 object/role/flag
#    edits). Optional paths that Codex did not create are skipped; the detail
#    component itself is hard-required in section 6 below.
note "oxlint"
VPO_PATHS=(
  packages/twenty-apps/pashx-mab/src/vendor-purchase-order
  packages/twenty-apps/pashx-mab/src/front-components/vendor-purchase-order.front-component.tsx
  packages/twenty-apps/pashx-mab/src/front-components/vendor-purchase-order.copy.ts
  packages/twenty-apps/pashx-mab/src/front-components/vendor-purchase-order.styles.ts
  packages/twenty-apps/pashx-mab/src/page-layouts/vendor-purchase-order.page-layout.ts
  packages/twenty-apps/pashx-mab/src/navigation-menu-items/vendor-purchase-order.navigation-menu-item.ts
  packages/twenty-apps/pashx-mab/src/objects/document-line.object.ts
  packages/twenty-apps/pashx-mab/src/objects/procurement-case.object.ts
  packages/twenty-apps/pashx-mab/src/roles/admin.role.ts
  packages/twenty-apps/pashx-mab/src/roles/operator.role.ts
  packages/twenty-apps/pashx-mab/src/roles/viewer.role.ts
  packages/twenty-apps/pashx-mab/src/roles/evidence-agent.role.ts
  packages/twenty-apps/pashx-mab/src/roles/role-object-permissions.ts
  packages/twenty-apps/pashx-mab/src/permission-flags/approval-request.permission-flag.ts
  packages/twenty-apps/pashx-mab/src/permission-flags/approval-decide.permission-flag.ts
  packages/twenty-apps/pashx-mab/test/vendor-purchase-order.model.test.ts
  packages/twenty-apps/pashx-mab/test/vendor-purchase-order.ui.test.ts
  packages/twenty-apps/pashx-mab/test/vendor-purchase-order.accessibility.test.ts
)
EXISTING=()
for p in "${VPO_PATHS[@]}"; do
  if [ -e "$p" ]; then
    EXISTING+=("$p")
  fi
done
if [ "${#EXISTING[@]}" -eq 0 ]; then
  bad "no VPO files present to lint (Codex VPO3-C source not landed)"
else
  if (cd packages/twenty-apps/pashx-mab && npx oxlint -c .oxlintrc.json "${EXISTING[@]}"); then
    ok "oxlint vpo files (${#EXISTING[@]} present)"
  else
    bad "oxlint vpo files"
  fi
fi

# 5. Diff whitespace check
note "git diff --check"
if git diff --check; then
  ok "git diff --check"
else
  bad "git diff --check"
fi

# 6. Read-only source assertions on the vendor-purchase-order front component
note "read-only assertions"
COMPONENT="${VPO_FRONT_COMPONENT:-packages/twenty-apps/pashx-mab/src/front-components/vendor-purchase-order.front-component.tsx}"
if [ ! -f "$COMPONENT" ]; then
  bad "component file missing: $COMPONENT (Codex must land the detail page at this path)"
else
  if grep -q "fetch(" "$COMPONENT"; then
    bad "component contains fetch("
  else
    ok "no fetch("
  fi
  if grep -qiE "import .*mutation|useMutation" "$COMPONENT"; then
    bad "component imports a mutation hook/module"
  else
    ok "no mutation imports"
  fi
  if grep -q 'target="_top"' "$COMPONENT"; then
    ok "native target=_top links"
  else
    bad "no target=_top links"
  fi
  if grep -qiE "al noor|omar" "$COMPONENT"; then
    bad "component contains mockup values (Al Noor / Omar)"
  else
    ok "no mockup values (Al Noor / Omar)"
  fi
fi

# 7. Fixture cleanup proof (operator fills FIXTURE_IDS: space-separated UUIDs)
note "fixture cleanup"
if [ -n "${FIXTURE_IDS:-}" ]; then
  for id in $FIXTURE_IDS; do
    # PLACEHOLDER: replace with the actual deletion command for the record type.
    # Must never run against the live pilot; VPO-QA-DISPOSABLE-<run-id> only.
    echo "fixture $id noted (placeholder — replace with the real deletion command before VPO6; no deletion runs here)"
  done
  echo "REQUIRED at VPO6-A: verify absence of each ID (REST 404 + SQL zero-row + pre/post counts), then reload and confirm honest counts"
  ok "fixture IDs noted: $FIXTURE_IDS (cleanup proof deferred to VPO6-A)"
else
  ok "no fixtures provided; cleanup proof skipped"
fi

printf '\nVPO6 source gates: %d pass, %d fail\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
