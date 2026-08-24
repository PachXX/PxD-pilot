# PxD MAB Procurement

This private PxD application is the metadata and presentation boundary for the single-workspace MAB procurement pilot.

The manifest installs the application, four approved object identities, eight command permission flags, and least-privilege Admin, Operator, Finance, and Viewer roles. Viewer is the default application role. The T3 Vendor PO vertical slice proves authenticated, versioned, idempotent writes. Version 0.2 adds the read-only Operational profitability Evidence Ledger: real finalized-record queries, separate-currency totals, prior-period comparisons, explicit exclusions, deterministic margin analysis, and source-record drill-through.

Version 0.2.1 adds complete English/Arabic dashboard copy, reactive host-locale support, true RTL layout, Arabic manifest labels, explicit light/dark contrast tokens, keyboard-visible focus, 44px targets, reduced-motion handling, and localized loading/empty/error/partial evidence states.

Version 0.2.5 is the repaired UI5 runtime-acceptance candidate. It includes the 0.2.2 geometry-preserving loading, visible active-filter provenance, frozen three-range responsive contract, 16px normal reading text, accessible visited evidence links, locally bundled IBM Plex fonts, complete PxD application/browser branding, the corrected native `STANDALONE_PAGE` navigation target, host-preserved Arabic `lang`/RTL direction semantics, and render-safe formatting for invalid or intermediate native date-input values. The font files are sourced from IBM Plex commit `bf260093582f04622aacc1e9f9ca604d7ccd0c42` under the included SIL Open Font License 1.1; they require no runtime connection to a font CDN.

The dashboard does not provide accounting P&L, currency conversion, AI insights, or transactional Command-centre workflows. Those remain outside the post-SG interface graph.

Stable object, field, capability, command, error, and mapping identifiers come from `pashx-mab-contract`. Do not duplicate or regenerate them inside the app.
