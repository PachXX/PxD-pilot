# Runbook — teardown

- Node: CL0
- Owner: Claude Code
- Date: 2026-08-05
- Script: `infra/pashx-mab-gcp/scripts/90-teardown.sh`

> **This procedure is destructive and irreversible for anything not exported first.**
> It deletes the Cloud SQL instance and every automated backup, the document bucket and every
> object version in it, the application VM, the static IP, the service accounts, and the
> Secret Manager secrets. Read this document in full before running the script.

## When teardown is appropriate

- End of the MAB pilot, after the SG gate has decided ship or no-ship and evidence is archived.
- Rebuilding in a different region — the region is immutable for Cloud SQL and the bucket, so a
  region change *is* a teardown.
- The budget ceiling fired at 100% and the environment must stop costing money.
- The environment was provisioned into the wrong project and must be removed.

## When it is not

- To fix a broken deploy — use [`runbook-rollback.md`](runbook-rollback.md) procedure C, which
  replaces only the VM.
- To reset test data — drop and recreate the `twenty_test` database instead. That is what the
  disposable boundary exists for.
- Any time accepted MAB production data exists. There is none before the SG gate, by design.

## Refusal guard

`90-teardown.sh` **refuses to run** against `pashxd-e56c5` or `lynex-ai`.

`pashxd-e56c5` hosts the live PashxD product: Cloud Run service `pashxd-api` at 100% traffic,
five agent jobs, six enabled schedulers with daily outbound external effects, Firebase Auth,
and 13 production secrets. If IDR-0001 Option B was chosen and the MAB pilot really does live in
that project, teardown must be done resource-by-resource with targeted
`terraform destroy -target=...` after a human reads every line of the plan. Never bulk-destroy
there. This is the concrete operational cost of Option B, and it is why Option A is recommended.

## Pre-teardown checklist

Complete every line. Each one is unrecoverable afterwards.

- [ ] SG gate decision is recorded in the shared Obsidian context.
- [ ] All CL0/CL2/CL3 evidence is written into `docs/operations/pashx-mab-gcp/` and committed.
      Cloud resources are about to stop being inspectable.
- [ ] Final Cloud SQL export taken and copied somewhere outside the project.
- [ ] Any document in the bucket that is worth keeping is copied out.
- [ ] `ENCRYPTION_KEY` and `FALLBACK_ENCRYPTION_KEY` are in an offline password manager **if**
      the exported database will ever be restored — without them the encrypted fields in that
      export are permanently unreadable.
- [ ] Image digests referenced in evidence are recorded, or the images are copied to a registry
      that will survive.
- [ ] Shahil has explicitly authorized teardown. It is not a Claude decision.

## Procedure

```bash
infra/pashx-mab-gcp/scripts/90-teardown.sh <PROJECT> <REGION>
```

The script, in order:

1. Refuses if the project is protected.
2. Prints exactly what will be deleted and requires the project id typed back.
3. Takes a final Cloud SQL export to the state bucket, granting the Cloud SQL service agent
   `objectCreator` on that bucket to do so.
4. Lists the objects currently in the document bucket.
5. Waits 15 seconds for a Ctrl-C.
6. Applies `sql_deletion_protection=false` — a separate, deliberate step, so deletion protection
   is never off by accident.
7. Empties the document bucket.
8. Runs `terraform destroy`.
9. Verifies nothing billable remains.

Expect 15–25 minutes; Cloud SQL deletion and the PSA peering teardown dominate.

### `terraform destroy` will REFUSE until the certificate disk is released

`google_compute_disk.caddy_certs` carries `lifecycle { prevent_destroy = true }`, so a plain
`terraform destroy` fails with `Instance cannot be destroyed`. That guard is deliberate: the disk
holds Caddy's ACME account and issued certificate, and Let's Encrypt caps issuance at 5 certificates
per exact set of identifiers per 168 hours. Losing it once is recoverable; losing it repeatedly took
public HTTPS down for a day during CL3.

To complete a real teardown, remove the `prevent_destroy` block in `compute.tf` and re-run — a
deliberate two-step edit, not a flag. Do **not** remove the guard for any other reason.

The disk is 10 GB `pd-standard`, roughly ₹35/month. If the environment is being torn down but may
be rebuilt on the same `nip.io` hostname within the week, **keep the disk** and let the new instance
reattach it; that avoids spending another certificate from the quota.

## Manual verification after the script

The script prints these, but check them yourself — the acceptance criterion is that teardown is
*proven*, and a clean exit code is not proof.

```bash
gcloud compute instances list --project=<PROJECT>
```

```bash
gcloud sql instances list --project=<PROJECT>
```

```bash
gcloud compute addresses list --project=<PROJECT>
```

```bash
gcloud storage buckets list --project=<PROJECT>
```

```bash
gcloud secrets list --project=<PROJECT>
```

```bash
gcloud artifacts repositories list --project=<PROJECT>
```

All should be empty apart from the state bucket. An orphaned static IP is the most common
leftover and keeps billing; a reserved-but-unused address costs more than an in-use one.

Confirm spend goes to zero the following day:

```bash
gcloud billing accounts list
```

Then check the billing console for the project — a nonzero figure 48 hours after teardown means
something survived.

## Deliberately left behind

| Resource | Why |
|---|---|
| Terraform state bucket | Holds the final SQL export the script just wrote. Delete manually once that export is archived elsewhere |
| The final SQL export | The last recoverable copy of the pilot database |
| The GCP project itself | Deleting a project is a separate, 30-day-reversible action and is Shahil's call, not the script's |
| APIs enabled by `10-enable-apis.sh` | `disable_on_destroy = false`. Disabling APIs can break unrelated things and is free to leave on |

To finish completely, after archiving the export:

```bash
gcloud storage rm -r gs://<PROJECT>-pashx-mab-tfstate --project=<PROJECT>
```

```bash
gcloud projects delete <PROJECT>
```

Project deletion is reversible for 30 days.

## Record the teardown

Append to [`CL0-provisioning-evidence.md`](CL0-provisioning-evidence.md): date, who authorized
it, the final export path, the verification output showing nothing billable remains, and
anything intentionally left in place. Then append a handoff entry to the shared Obsidian context
and set the CL0 row state accordingly.
