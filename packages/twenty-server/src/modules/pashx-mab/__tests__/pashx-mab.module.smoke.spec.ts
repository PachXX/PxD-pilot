import { Module } from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { MetricsModule } from 'src/engine/core-modules/metrics/metrics.module';
import { UserRoleModule } from 'src/engine/metadata-modules/user-role/user-role.module';
import { CustomPermissionGuard } from 'src/engine/guards/custom-permission.guard';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { WorkspaceCacheModule } from 'src/engine/workspace-cache/workspace-cache.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { PashxVendorPurchaseOrderController } from 'src/modules/pashx-mab/controllers/pashx-vendor-purchase-order.controller';
import { PashxMabModule } from 'src/modules/pashx-mab/pashx-mab.module';
import { PashxCapabilityService } from 'src/modules/pashx-mab/services/pashx-capability.service';
import { PashxCommandSupportService } from 'src/modules/pashx-mab/services/pashx-command-support.service';
import { PashxVendorPurchaseOrderPersistenceService } from 'src/modules/pashx-mab/services/pashx-vendor-purchase-order-persistence.service';
import { PashxVendorPurchaseOrderService } from 'src/modules/pashx-mab/services/pashx-vendor-purchase-order.service';
import { PashxWorkspaceSchemaService } from 'src/modules/pashx-mab/services/pashx-workspace-schema.service';

@Module({})
class IsolatedInfrastructureModule {}

const PASHX_PROVIDERS = [
  PashxCapabilityService,
  PashxCommandSupportService,
  PashxVendorPurchaseOrderService,
  PashxVendorPurchaseOrderPersistenceService,
  PashxWorkspaceSchemaService,
] as const;

describe('PashxMabModule boot smoke', () => {
  it('declares every module required by the guarded controller', () => {
    const imports: unknown = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      PashxMabModule,
    );

    expect(imports).toEqual(
      expect.arrayContaining([
        MetricsModule,
        TokenModule,
        UserRoleModule,
        WorkspaceCacheModule,
        WorkspaceCacheStorageModule,
      ]),
    );
  });

  it('compiles and resolves its guarded controller without Redis or a database', async () => {
    let builder = Test.createTestingModule({ imports: [PashxMabModule] })
      .overrideModule(MetricsModule)
      .useModule(IsolatedInfrastructureModule)
      .overrideModule(TokenModule)
      .useModule(IsolatedInfrastructureModule)
      .overrideModule(UserRoleModule)
      .useModule(IsolatedInfrastructureModule)
      .overrideModule(WorkspaceCacheModule)
      .useModule(IsolatedInfrastructureModule)
      .overrideModule(WorkspaceCacheStorageModule)
      .useModule(IsolatedInfrastructureModule)
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(WorkspaceAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(CustomPermissionGuard)
      .useValue({ canActivate: () => true });

    for (const provider of PASHX_PROVIDERS) {
      builder = builder.overrideProvider(provider).useValue({});
    }

    const testingModule = await builder.compile();

    expect(testingModule.get(PashxVendorPurchaseOrderController)).toBeDefined();

    await testingModule.close();
  });
});
