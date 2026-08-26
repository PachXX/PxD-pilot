import { Module } from '@nestjs/common';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { MetricsModule } from 'src/engine/core-modules/metrics/metrics.module';
import { UserRoleModule } from 'src/engine/metadata-modules/user-role/user-role.module';
import { WorkspaceCacheModule } from 'src/engine/workspace-cache/workspace-cache.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { PashxApprovalCommandController } from 'src/modules/pashx-mab/controllers/pashx-approval-command.controller';
import { PashxCaseTransitionController } from 'src/modules/pashx-mab/controllers/pashx-case-transition.controller';
import { PashxDeliveryRecordController } from 'src/modules/pashx-mab/controllers/pashx-delivery-record.controller';
import { PashxDocumentLifecycleController } from 'src/modules/pashx-mab/controllers/pashx-document-lifecycle.controller';
import { PashxSupplierRfqController } from 'src/modules/pashx-mab/controllers/pashx-supplier-rfq.controller';
import { PashxVendorPurchaseOrderController } from 'src/modules/pashx-mab/controllers/pashx-vendor-purchase-order.controller';
import { PashxApprovalCommandService } from 'src/modules/pashx-mab/services/pashx-approval-command.service';
import { PashxCapabilityService } from 'src/modules/pashx-mab/services/pashx-capability.service';
import { PashxCaseTransitionService } from 'src/modules/pashx-mab/services/pashx-case-transition.service';
import { PashxCommandSupportService } from 'src/modules/pashx-mab/services/pashx-command-support.service';
import { PashxCompanyIdentityService } from 'src/modules/pashx-mab/services/pashx-company-identity.service';
import { PashxDeliveryRecordService } from 'src/modules/pashx-mab/services/pashx-delivery-record.service';
import { PashxDocumentLifecycleService } from 'src/modules/pashx-mab/services/pashx-document-lifecycle.service';
import { PashxSupplierRfqService } from 'src/modules/pashx-mab/services/pashx-supplier-rfq.service';
import { PashxVendorPurchaseOrderService } from 'src/modules/pashx-mab/services/pashx-vendor-purchase-order.service';
import { PashxVendorPurchaseOrderPersistenceService } from 'src/modules/pashx-mab/services/pashx-vendor-purchase-order-persistence.service';
import { PashxWorkflowPersistenceService } from 'src/modules/pashx-mab/services/pashx-workflow-persistence.service';
import { PashxWorkspaceSchemaService } from 'src/modules/pashx-mab/services/pashx-workspace-schema.service';

@Module({
  // JwtAuthGuard injects BOTH AccessTokenService (TokenModule) and WorkspaceCacheStorageService
  // (WorkspaceCacheStorageModule). A guard's dependencies resolve from the module that declares the
  // CONTROLLER, not from wherever the guard class happens to live, so missing either one stops the
  // entire server from booting with
  //   Nest can't resolve dependencies of the JwtAuthGuard (...)
  // which names the engine's guard and gives no hint that the missing import belongs here.
  //
  // Nest reports only the FIRST unresolved argument, so supplying one surfaces the next on the
  // following boot — these two cost two separate deploy cycles to find one at a time. Both are
  // listed together deliberately; see webhook.module.ts, which imports exactly this pair for the
  // same guard.
  //
  // WorkspaceCacheStorageModule is NOT WorkspaceCacheModule: the latter exports only
  // WorkspaceCacheService. Importing one does not provide the other.
  imports: [
    MetricsModule,
    TokenModule,
    UserRoleModule,
    WorkspaceCacheModule,
    WorkspaceCacheStorageModule,
  ],
  controllers: [
    PashxApprovalCommandController,
    PashxCaseTransitionController,
    PashxDeliveryRecordController,
    PashxDocumentLifecycleController,
    PashxSupplierRfqController,
    PashxVendorPurchaseOrderController,
  ],
  providers: [
    PashxApprovalCommandService,
    PashxCapabilityService,
    PashxCaseTransitionService,
    PashxCommandSupportService,
    PashxCompanyIdentityService,
    PashxDeliveryRecordService,
    PashxDocumentLifecycleService,
    PashxSupplierRfqService,
    PashxVendorPurchaseOrderService,
    PashxVendorPurchaseOrderPersistenceService,
    PashxWorkflowPersistenceService,
    PashxWorkspaceSchemaService,
  ],
})
export class PashxMabModule {}
