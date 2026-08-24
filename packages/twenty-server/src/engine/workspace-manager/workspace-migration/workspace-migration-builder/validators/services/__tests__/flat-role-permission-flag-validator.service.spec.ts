import { createEmptyFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/constant/create-empty-flat-entity-maps.constant';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { type FlatRolePermissionFlag } from 'src/engine/metadata-modules/flat-role-permission-flag/types/flat-role-permission-flag.type';
import { type FlatRole } from 'src/engine/metadata-modules/flat-role/types/flat-role.type';
import { PermissionsExceptionCode } from 'src/engine/metadata-modules/permissions/permissions.exception';
import { FlatRolePermissionFlagValidatorService } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-builder/validators/services/flat-role-permission-flag-validator.service';

const CALLER_APPLICATION_ID = '00000000-0000-4000-8000-000000000001';
const OTHER_APPLICATION_ID = '00000000-0000-4000-8000-000000000002';
const ROLE_UNIVERSAL_IDENTIFIER = '00000000-0000-4000-8000-000000000003';
const RELATION_UNIVERSAL_IDENTIFIER = '00000000-0000-4000-8000-000000000004';

const emptyRoleMaps = (): FlatEntityMaps<FlatRole> =>
  createEmptyFlatEntityMaps() as unknown as FlatEntityMaps<FlatRole>;

const emptyRolePermissionFlagMaps =
  (): FlatEntityMaps<FlatRolePermissionFlag> =>
    createEmptyFlatEntityMaps() as unknown as FlatEntityMaps<FlatRolePermissionFlag>;

const buildRole = (): FlatRole =>
  ({
    id: ROLE_UNIVERSAL_IDENTIFIER,
    universalIdentifier: ROLE_UNIVERSAL_IDENTIFIER,
    applicationUniversalIdentifier: OTHER_APPLICATION_ID,
    isEditable: false,
  }) as unknown as FlatRole;

const buildRelation = (
  applicationUniversalIdentifier: string,
): FlatRolePermissionFlag =>
  ({
    id: RELATION_UNIVERSAL_IDENTIFIER,
    universalIdentifier: RELATION_UNIVERSAL_IDENTIFIER,
    applicationUniversalIdentifier,
    roleUniversalIdentifier: ROLE_UNIVERSAL_IDENTIFIER,
    permissionFlagUniversalIdentifier: '00000000-0000-4000-8000-000000000005',
  }) as unknown as FlatRolePermissionFlag;

const buildDeletionArgs = (relation: FlatRolePermissionFlag) => {
  const flatRolePermissionFlagMaps = emptyRolePermissionFlagMaps();
  const flatRoleMaps = emptyRoleMaps();
  const role = buildRole();

  flatRolePermissionFlagMaps.byUniversalIdentifier[
    relation.universalIdentifier
  ] = relation;
  flatRoleMaps.byUniversalIdentifier[role.universalIdentifier] = role;

  return {
    flatEntityToValidate: relation,
    optimisticFlatEntityMapsAndRelatedFlatEntityMaps: {
      flatRolePermissionFlagMaps,
      flatRoleMaps,
    },
    buildOptions: {
      applicationUniversalIdentifier: CALLER_APPLICATION_ID,
      isSystemBuild: false,
    },
  } as unknown as Parameters<
    FlatRolePermissionFlagValidatorService['validateFlatRolePermissionFlagDeletion']
  >[0];
};

describe('FlatRolePermissionFlagValidatorService', () => {
  const service = new FlatRolePermissionFlagValidatorService();

  describe('validateFlatRolePermissionFlagDeletion', () => {
    it('allows an application to remove its own flag relation from a non-editable role', () => {
      const result = service.validateFlatRolePermissionFlagDeletion(
        buildDeletionArgs(buildRelation(CALLER_APPLICATION_ID)),
      );

      expect(result.errors).toHaveLength(0);
    });

    it('rejects removing another application relation from a non-editable role', () => {
      const result = service.validateFlatRolePermissionFlagDeletion(
        buildDeletionArgs(buildRelation(OTHER_APPLICATION_ID)),
      );

      expect(result.errors.map(({ code }) => code)).toEqual([
        PermissionsExceptionCode.ROLE_NOT_EDITABLE,
      ]);
    });
  });
});
