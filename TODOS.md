# PashX Follow-up Work

## Multi-tenant SaaS productization

- **What:** Convert the accepted MAB configuration into a versioned PashX workspace blueprint with tenant provisioning, upgrade compatibility, isolation, and configurable industry packs.
- **Why:** The pilot intentionally proves one customer and one deployment before introducing tenancy and cross-industry abstractions.
- **Pros:** Reuses validated procurement behavior and supports later construction, manufacturing, retail fit-out, energy, and utilities offerings.
- **Cons:** Adds tenant isolation, migrations, configuration/version management, billing, support, deployment, and upgrade complexity.
- **Context:** Begin from the accepted MAB metadata, stable contracts, permission mappings, imports, transaction invariants, and UI patterns. Separate proven common behavior from MAB-specific terminology and workflow; do not generalize assumptions without evidence from the pilot.
- **Depends on / blocked by:** MAB acceptance, observed usage evidence, AGPL/IP review, and a dedicated SaaS architecture and security review.
- **Status:** Deferred until after the single-customer MAB pilot.

## Browser import center

- **What:** Productize the staged-import CLI engine as an authenticated browser workflow with saved mappings, uploads, dry-run progress, downloadable correction reports, approval, cancellation, resumability, and audit history.
- **Why:** Recurring imports should eventually be operable by MAB or future customer staff without command-line access.
- **Pros:** Reduces support effort, makes validation and correction states visible, and turns the proven import engine into a reusable product capability.
- **Cons:** Adds upload/session state, resumability, authorization, correction UX, progress reporting, and long-running-job complexity.
- **Context:** Reuse the CLI's immutable source versions, mapping versions, stable error codes, full dry run, zero-blocking-error gate, explicit approval, and idempotent per-chain commit. Do not create a second parsing or validation implementation.
- **Depends on / blocked by:** Successful pilot imports, accepted import contracts, and evidence that recurring self-service imports are required.
- **Status:** Deferred until after MAB pilot acceptance.
