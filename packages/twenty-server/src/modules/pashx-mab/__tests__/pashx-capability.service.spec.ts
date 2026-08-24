import { createEmptyFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/constant/create-empty-flat-entity-maps.constant';
import { type SyncableFlatEntity } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-from.type';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { addFlatEntityToFlatEntityMapsOrThrow } from 'src/engine/metadata-modules/flat-entity/utils/add-flat-entity-to-flat-entity-maps-or-throw.util';
import { type FlatRolePermissionFlag } from 'src/engine/metadata-modules/flat-role-permission-flag/types/flat-role-permission-flag.type';
import { type FlatRole } from 'src/engine/metadata-modules/flat-role/types/flat-role.type';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { STANDARD_ROLE } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-role.constant';
import { PashxCapabilityService } from 'src/modules/pashx-mab/services/pashx-capability.service';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
const USER_WORKSPACE_ID = '22222222-2222-4222-8222-222222222222';
const ROLE_ID = '33333333-3333-4333-8333-333333333333';
const CUSTOM_ROLE_UNIVERSAL_IDENTIFIER = '44444444-4444-4444-8444-444444444444';
const CAPABILITY_UNIVERSAL_IDENTIFIER = '55555555-5555-4555-8555-555555555555';
const ROLE_PERMISSION_FLAG_ID = '66666666-6666-4666-8666-666666666666';
const ROLE_PERMISSION_FLAG_UNIVERSAL_IDENTIFIER =
  '77777777-7777-4777-8777-777777777777';

const buildFlatEntityMaps = <T extends SyncableFlatEntity>(
  entities: T[],
): FlatEntityMaps<T> =>
  entities.reduce(
    (maps, entity) =>
      addFlatEntityToFlatEntityMapsOrThrow({
        flatEntity: entity,
        flatEntityMaps: maps,
      }),
    createEmptyFlatEntityMaps() as FlatEntityMaps<T>,
  );

const createRole = ({
  universalIdentifier,
  rolePermissionFlagIds = [],
}: {
  universalIdentifier: string;
  rolePermissionFlagIds?: string[];
}) =>
  ({
    id: ROLE_ID,
    universalIdentifier,
    rolePermissionFlagIds,
  }) as FlatRole;

const createRolePermissionFlag = () =>
  ({
    id: ROLE_PERMISSION_FLAG_ID,
    universalIdentifier: ROLE_PERMISSION_FLAG_UNIVERSAL_IDENTIFIER,
    permissionFlagUniversalIdentifier: CAPABILITY_UNIVERSAL_IDENTIFIER,
  }) as FlatRolePermissionFlag;

describe('PashxCapabilityService', () => {
  let service: PashxCapabilityService;
  let userRoleService: { getRoleIdForUserWorkspace: jest.Mock };
  let workspaceCacheService: { getOrRecompute: jest.Mock };

  beforeEach(() => {
    userRoleService = {
      getRoleIdForUserWorkspace: jest.fn().mockResolvedValue(ROLE_ID),
    };
    workspaceCacheService = {
      getOrRecompute: jest.fn(),
    };
    service = new PashxCapabilityService(
      userRoleService as unknown as UserRoleService,
      workspaceCacheService as unknown as WorkspaceCacheService,
    );
  });

  const resolveCapability = () =>
    service.getRoleIdIfUserHasCapability({
      workspaceId: WORKSPACE_ID,
      userWorkspaceId: USER_WORKSPACE_ID,
      capabilityUniversalIdentifier: CAPABILITY_UNIVERSAL_IDENTIFIER,
    });

  it('grants application capabilities to the standard workspace Admin role', async () => {
    const role = createRole({
      universalIdentifier: STANDARD_ROLE.admin.universalIdentifier,
    });

    workspaceCacheService.getOrRecompute.mockResolvedValue({
      flatRoleMaps: buildFlatEntityMaps([role]),
      flatRolePermissionFlagMaps: buildFlatEntityMaps([]),
    });

    await expect(resolveCapability()).resolves.toBe(ROLE_ID);
  });

  it('grants an explicitly related application capability', async () => {
    const role = createRole({
      universalIdentifier: CUSTOM_ROLE_UNIVERSAL_IDENTIFIER,
      rolePermissionFlagIds: [ROLE_PERMISSION_FLAG_ID],
    });

    workspaceCacheService.getOrRecompute.mockResolvedValue({
      flatRoleMaps: buildFlatEntityMaps([role]),
      flatRolePermissionFlagMaps: buildFlatEntityMaps([
        createRolePermissionFlag(),
      ]),
    });

    await expect(resolveCapability()).resolves.toBe(ROLE_ID);
  });

  it('denies a non-admin role without the requested capability relation', async () => {
    const role = createRole({
      universalIdentifier: CUSTOM_ROLE_UNIVERSAL_IDENTIFIER,
    });

    workspaceCacheService.getOrRecompute.mockResolvedValue({
      flatRoleMaps: buildFlatEntityMaps([role]),
      flatRolePermissionFlagMaps: buildFlatEntityMaps([]),
    });

    await expect(resolveCapability()).resolves.toBeUndefined();
  });
});
