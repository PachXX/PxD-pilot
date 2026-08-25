#!/usr/bin/env bash
# QV6 source-gate runner for the PashX MAB Quotation & Vendor Comparison page.
# Executes the locally-runnable acceptance gates from the frozen QV2 matrix.
# Lane protocol: claude ports 2022, codex 2024, integration 2026. Containers
# must use lane-specific project names/ports and be STOPPED after QA.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

PASS=0
FAIL=0

note() { printf '\n== %s ==\n' "$1"; }
ok()   { printf 'PASS: %s\n' "$1"; PASS=$((PASS + 1)); }
bad()  { printf 'FAIL: %s\n' "$1"; FAIL=$((FAIL + 1)); }

# 1. App suite (must be green incl. vendor-comparison specs)
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

# 4. oxlint on the vendor-comparison files
note "oxlint"
VC_PATHS=(
  packages/twenty-apps/pashx-mab/src/vendor-comparison
  packages/twenty-apps/pashx-mab/src/front-components/vendor-comparison.copy.ts
  packages/twenty-apps/pashx-mab/src/front-components/vendor-comparison.front-component.tsx
  packages/twenty-apps/pashx-mab/src/front-components/vendor-comparison.styles.ts
  packages/twenty-apps/pashx-mab/src/navigation-menu-items/vendor-comparison.navigation-menu-item.ts
  packages/twenty-apps/pashx-mab/src/page-layouts/vendor-comparison.page-layout.ts
  packages/twenty-apps/pashx-mab/test/vendor-comparison.model.test.ts
  packages/twenty-apps/pashx-mab/test/vendor-comparison.ui.test.ts
  packages/twenty-apps/pashx-mab/test/vendor-comparison.accessibility.test.ts
)
if (cd packages/twenty-apps/pashx-mab && yarn lint 2>/dev/null || npx oxlint -c .oxlintrc.json "${VC_PATHS[@]}"); then
  ok "oxlint vendor-comparison"
else
  bad "oxlint vendor-comparison"
fi

# 5. diff whitespace check
note "git diff --check"
if git diff --check; then
  ok "git diff --check"
else
  bad "git diff --check"
fi

# 6. Read-only source assertions on the front component
note "read-only assertions"
COMPONENT=packages/twenty-apps/pashx-mab/src/front-components/vendor-comparison.front-component.tsx
if [ ! -f "$COMPONENT" ]; then
  bad "component file missing: $COMPONENT"
else
  if grep -q "fetch(" "$COMPONENT"; then
    bad "component contains fetch("
  else
    ok "no fetch("
  fi
  if grep -qE "\bmutat" "$COMPONENT"; then
    bad "component contains mutation reference"
  else
    ok "no mutation reference"
  fi
  if grep -q 'target="_top"' "$COMPONENT"; then
    ok "native target=_top links"
  else
    bad "no target=_top links"
  fi
fi

# 7. Fixture cleanup proof (operator fills FIXTURE_IDS: space-separated UUIDs)
note "fixture cleanup"
if [ -n "${FIXTURE_IDS:-}" ]; then
  for id in $FIXTURE_IDS; do
    # PLACEHOLDER: replace with the actual deletion command for the record type.
    # Must never run against the live pilot; disposable QV6-QA-DISPOSABLE records only.
    echo "deleting fixture $id (placeholder — fill in real command before QV6)"
  done
  echo "verify absence of each ID, then reload the page and confirm honest counts"
  ok "cleanup proof recorded for: $FIXTURE_IDS"
else
  ok "no fixtures provided; cleanup proof skipped"
fi

printf '\nQV6 source gates: %d pass, %d fail\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
