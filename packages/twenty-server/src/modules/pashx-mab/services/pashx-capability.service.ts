import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import {
  PermissionsException,
  PermissionsExceptionCode,
} from 'src/engine/metadata-modules/permissions/permissions.exception';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';

@Injectable()
export class PashxCapabilityService {
  constructor(
    private readonly userRoleService: UserRoleService,
    private readonly workspaceCacheService: WorkspaceCacheService,
  ) {}

  async getRoleIdIfUserHasCapability({
    workspaceId,
    userWorkspaceId,
    capabilityUniversalIdentifier,
  }: {
    workspaceId: string;
    userWorkspaceId: string;
    capabilityUniversalIdentifier: string;
  }): Promise<string | undefined> {
    let roleId: string;

    try {
      roleId = await this.userRoleService.getRoleIdForUserWorkspace({
        workspaceId,
        userWorkspaceId,
      });
    } catch (error) {
      if (
        error instanceof PermissionsException &&
        error.code === PermissionsExceptionCode.NO_ROLE_FOUND_FOR_USER_WORKSPACE
      ) {
        return undefined;
      }

      throw error;
    }
    const { flatRoleMaps, flatRolePermissionFlagMaps } =
      await this.workspaceCacheService.getOrRecompute(workspaceId, [
        'flatRoleMaps',
        'flatRolePermissionFlagMaps',
      ]);
    const roleUniversalIdentifier =
      flatRoleMaps.universalIdentifierById[roleId];
    const role = isDefined(roleUniversalIdentifier)
      ? flatRoleMaps.byUniversalIdentifier[roleUniversalIdentifier]
      : undefined;

    if (!isDefined(role)) {
      return undefined;
    }

    const hasCapability = role.rolePermissionFlagIds.some(
      (rolePermissionFlagId) => {
        const universalIdentifier =
          flatRolePermissionFlagMaps.universalIdentifierById[
            rolePermissionFlagId
          ];

        return (
          isDefined(universalIdentifier) &&
          flatRolePermissionFlagMaps.byUniversalIdentifier[universalIdentifier]
            ?.permissionFlagUniversalIdentifier ===
            capabilityUniversalIdentifier
        );
      },
    );

    return hasCapability ? roleId : undefined;
  }
}
