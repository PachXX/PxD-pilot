# SG — MAB Procurement Pilot Ship Decision

- Date: 2026-08-14
- Decision owners: Shahil (business authority), Codex (application/CX acceptance), Claude Code (cloud/operations evidence)
- Decision: **SHIP — internal disposable-data pilot only**
- Production-data promotion: **not authorized by this decision**

## Gate result

| Requirement | Evidence | Result |
|---|---|---|
| No unresolved P0/P1 | CL1 reported none; CX1 dispositions complete | pass |
| Provisioning and immutable deployment | CL0/CL3/CL5 complete; deployed host digest `sha256:fbe0ae9e5917ab1c89ce67a4773cfe8efa058f03e439f0b31facee0b618047e7` | pass |
| Application install and browser acceptance | PashX MAB `0.1.11`; CX2-R bounded success | pass |
| Cloud SQL transaction invariants | CL2 69/69; CX2-R exactly one document, receipt, audit event, number allocation, and case-version increment | pass |
| Authentication and authorization | Both permission layers fail closed; missing Admin application capability repaired and verified | pass |
| Private database boundary | Cloud SQL remains private-IP-only; no public IP or authorized network | pass |
| Storage compatibility | Gate 0 technical suite 9/9 | pass |
| Monitoring | CL0-M1 drill completed; alert opened and closed, email received | pass with accepted Phase C evidence limitation |
| Rollback/backup/PITR/teardown | Runbooks and recorded technical drills available in CL0 evidence | pass for pilot |
| Demo-data hygiene | 44 disposable cases and 56 draft documents soft-deleted; accepted CX2-R record retained | pass |
| Business authority | Shahil: “I approve Gate 0 and accept the recorded residual risks for the MAB procurement pilot.” | pass |

## Authorized scope

This decision authorizes the deployed MAB Vendor PO vertical slice for an internal company pilot and
sponsor/operator demonstration using disposable data. It authorizes normal pilot operation,
bounded demo preparation, and rollback under the existing runbooks.

It does not authorize real or residency-restricted MAB data, general production launch, expansion
into Inbox/Autopilot, or removal of the current safety guards. Those require a separate promotion
decision after the residual risks below are closed or explicitly re-accepted for that broader scope.

## Accepted residual risks

1. One human principal remains owner, deployer, and operator; machine identities are least privilege,
   but human-path separation is not demonstrated.
2. Full audit payload retention/redaction, including backup/PITR copies, is not frozen for real data.
3. Doha (`me-central1`) is the usable pilot region; KSA residency remains a commercial/billing-path
   decision rather than an engineering toggle.
4. Fiscal period/number rollover remains the provisional current-year ±1 rule.
5. CL0-M1 Phase C used weaker below-minimum-sample evidence; Phases B/D/E and alert delivery passed.
6. Local aggregate typecheck remains affected by the known workspace SDK-build/toolchain condition;
   the official private-app publisher build/typecheck and deployed behavior passed.

## Rollback conditions

Stop or roll back if authentication or Vendor PO creation fails; an unauthorized write succeeds;
numbering duplicates; stale overwrite, idempotency mismatch, or partial rollback occurs; secrets
appear in logs; health fails for five minutes; application errors exceed 1%; or internal financial
command p95 exceeds one second excluding external providers.

## Final disposition

All SG dependencies are satisfied for the scoped internal pilot. **SHIP** the MAB Procurement Pilot
as deployed. Keep the environment classified as disposable-data-only until a separate production
promotion decision closes or re-accepts the real-data risks.
