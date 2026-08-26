# AUTH schema investigation — endpoint scope mistaken for schema defect

- Date: 2026-08-26
- Scope: source-only investigation; no pilot access or mutation
- Status: `/graphql` auth claim disproved in source; `createOneTask` runtime cause unresolved

## Reproduction signature

The deployed `/graphql` endpoint contains workspace queries but rejects auth
mutations and `createOneTask`. The deployed JavaScript contains `AuthResolver`,
and `CoreEngineModule` imports `AuthModule`; therefore this is not missing build
output or conditional module registration.

## Root cause of the auth observation

Twenty intentionally splits GraphQL APIs. `GraphQLConfigService` builds
`/graphql` with `resolverSchemaScope: 'core'`. `AuthResolver` is explicitly
decorated `@MetadataResolver()`, so the patched Nest resolver explorer correctly
excludes it from `/graphql` and includes it in `/metadata`. Repository integration
helpers send `signUpInWorkspace`, `getLoginTokenFromCredentials`, and
`getAuthTokensFromLoginToken` to `/metadata` (`makeMetadataAPIRequest`), providing
the executable contract for the supported password flow.

Consequently, probing auth mutations only at `/graphql` does **not** establish a
deployed schema defect or broken password login. Moving `AuthResolver` to
`@CoreResolver()` would merely make that probe pass while removing auth from the
supported `/metadata` endpoint. No such source change was retained.

There is no static schema file, `schema:` option, Redis core-schema cache,
resolver allowlist, or conditional `AuthModule` registration involved.
`autoSchemaFile: true` constructs each scoped static schema. The metadata cache
is an operation-response cache for `/metadata`, not a schema cache.

## Separate `createOneTask` finding

Workspace CRUD is not provided by a static Nest resolver. `WorkspaceSchemaFactory`
loads per-workspace SDL and `WorkspaceResolverFactory` builds `createOne` methods;
`workspaceResolverBuilderMethodNames.mutations` includes `createOne`. Thus a
healthy Task object produces `createOneTask`. Its absence on the pilot cannot be
caused by `AuthResolver` scope. Without live access or the pilot's computed SDL,
workspace cache, and Task metadata, this lane cannot distinguish stale computed
SDL/cache from missing/disabled Task metadata or an application-filtered schema.

## Guard and required host-lane checks

`graphql-schema-scope.smoke.spec.ts` locks the source contract: auth remains in
the metadata scope, the login mutation exists, and the workspace schema builder
retains `createOne`. Run it with:

```sh
cd packages/twenty-server
npx jest src/engine/api/graphql/graphql-config/__tests__/graphql-schema-scope.smoke.spec.ts --runInBand
```

The host-build lane should first POST the login mutation to `/metadata`, not
`/graphql`. If it fails there, capture the exact response and running image
digest. Separately introspect authenticated `/graphql` for `createOneTask`, dump
the computed workspace SDL/Task flat metadata using read-only diagnostics, and
flush/recompute the workspace schema cache only under explicit operational
authority. No Dockerfile, Cloud Build, or startup-script source defect was found.
