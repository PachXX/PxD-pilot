import 'reflect-metadata';

import { RESOLVER_SCHEMA_SCOPE_KEY } from 'src/engine/api/graphql/graphql-config/constants/resolver-schema-scope-key.constant';
import { workspaceResolverBuilderMethodNames } from 'src/engine/api/graphql/workspace-resolver-builder/factories/factories';
import { AuthResolver } from 'src/engine/core-modules/auth/auth.resolver';

describe('GraphQL endpoint scope smoke', () => {
  it('keeps auth on metadata and workspace create mutations on the data API', () => {
    expect(Reflect.getMetadata(RESOLVER_SCHEMA_SCOPE_KEY, AuthResolver)).toBe(
      'metadata',
    );
    expect(AuthResolver.prototype.getLoginTokenFromCredentials).toBeDefined();
    expect(workspaceResolverBuilderMethodNames.mutations).toContain(
      'createOne',
    );
  });
});
