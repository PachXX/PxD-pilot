# Brand assets

## PxD (product identity)

`pxd-*` are the runtime browser, PWA, authentication, and workspace-default assets. They derive
from the Shahil-supplied source image `/Users/pxd/Desktop/PashxD/logo/Pashxd-logo2.jpg`.

The transparent master was prepared with the built-in OpenAI image editing tool, then mechanically
resampled for each declared browser size. Do not replace these files with upstream Twenty icons or
external URLs; the pilot must retain its PxD identity without a third-party asset dependency.

## MAB Indus Solutions (tenant identity)

`mab-logo-lockup.png` (light backgrounds) and `mab-logo-lockup-white.png` (dark backgrounds) are
the tenant lockup shown on the sign-in screen, added 2026-08-28 at Shahil's request.

Derived mechanically from the client-supplied deliverables at
`~/Downloads/MAB Logo Deliverables 2/PNG/` — alpha-trimmed and resampled to 600px wide
(2x the 180px display width). No recolouring, cropping of brand elements, or redrawing was done.

The lockup is ~3.5:1, so it cannot be used in the square `Logo` slots (48px primary / 24px
secondary badge) without being cropped or shrunk to a few pixels tall. It is rendered as its own
wide element instead — see `SignInUpStandardContent.tsx`.

The sign-in screen is pre-auth, so no workspace-member theme exists yet; the light/dark variant is
selected by `prefers-color-scheme`, which is the only signal available at that point.
