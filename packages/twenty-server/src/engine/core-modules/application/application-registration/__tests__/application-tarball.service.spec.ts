import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { type ApplicationManifest } from 'twenty-shared/application';

import { ApplicationVersionValidationService } from 'src/engine/core-modules/application/application-package/application-version-validation.service';
import { ApplicationRegistrationAssetService } from 'src/engine/core-modules/application/application-registration/application-registration-asset.service';
import { ApplicationRegistrationEntity } from 'src/engine/core-modules/application/application-registration/application-registration.entity';
import { ApplicationRegistrationService } from 'src/engine/core-modules/application/application-registration/application-registration.service';
import { ApplicationTarballService } from 'src/engine/core-modules/application/application-registration/application-tarball.service';
import { ApplicationRegistrationSourceType } from 'src/engine/core-modules/application/application-registration/enums/application-registration-source-type.enum';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { FileStorageService } from 'src/engine/core-modules/file-storage/services/file-storage.service';

type ApplicationTarballServiceInternals = {
  extractAndValidateTarball(
    tempDir: string,
    tarballBuffer: Buffer,
  ): Promise<{
    contentDir: string;
    manifest: { application?: ApplicationManifest };
    packageJson: {
      version: string;
      engines?: { twenty?: string };
    } | null;
  }>;
  storeTarballFile(params: {
    appRegistration: ApplicationRegistrationEntity;
    tarballBuffer: Buffer;
    ownerWorkspaceId: string;
  }): Promise<never>;
};

describe('ApplicationTarballService', () => {
  let service: ApplicationTarballService;
  let repository: jest.Mocked<Repository<ApplicationRegistrationEntity>>;
  let applicationRegistrationService: jest.Mocked<ApplicationRegistrationService>;

  const universalIdentifier = '00000000-0000-4000-8000-000000000001';
  const ownerWorkspaceId = '00000000-0000-4000-8000-000000000002';
  const pendingRegistration = {
    id: '00000000-0000-4000-8000-000000000003',
    universalIdentifier,
    sourceType: ApplicationRegistrationSourceType.TARBALL,
    latestAvailableVersion: null,
    tarballFileId: null,
  } as ApplicationRegistrationEntity;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationTarballService,
        {
          provide: getRepositoryToken(ApplicationRegistrationEntity),
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            findOneOrFail: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: FileStorageService,
          useValue: { writeFile: jest.fn() },
        },
        {
          provide: ApplicationRegistrationAssetService,
          useValue: { storeRegistrationAssets: jest.fn() },
        },
        {
          provide: ApplicationService,
          useValue: {
            findWorkspaceTwentyStandardAndCustomApplicationOrThrow: jest.fn(),
          },
        },
        {
          provide: ApplicationVersionValidationService,
          useValue: {
            validateServerCompatibility: jest.fn(),
            validateVersionProgression: jest.fn(),
          },
        },
        {
          provide: ApplicationRegistrationService,
          useValue: {
            emitRegistrationPublishMetric: jest.fn(),
            enqueueAutoUpgradeApplications: jest.fn(),
            updateFromManifest: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ApplicationTarballService);
    repository = module.get(getRepositoryToken(ApplicationRegistrationEntity));
    applicationRegistrationService = module.get(ApplicationRegistrationService);

    repository.findOne.mockResolvedValue(null);
    repository.create.mockReturnValue(pendingRegistration);
    repository.save.mockResolvedValue(pendingRegistration);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps a new registration version pending when tarball storage fails', async () => {
    const internals = service as unknown as ApplicationTarballServiceInternals;

    jest.spyOn(internals, 'extractAndValidateTarball').mockResolvedValue({
      contentDir: '/tmp/pashx-app',
      manifest: {
        application: {
          universalIdentifier,
          displayName: 'Retryable App',
        } as ApplicationManifest,
      },
      packageJson: { version: '1.0.0' },
    });
    jest
      .spyOn(internals, 'storeTarballFile')
      .mockRejectedValue(new Error('storage unavailable'));

    await expect(
      service.uploadTarball({
        tarballBuffer: Buffer.from('tarball'),
        ownerWorkspaceId,
      }),
    ).rejects.toThrow('storage unavailable');

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        universalIdentifier,
        latestAvailableVersion: null,
      }),
    );
    expect(repository.save).toHaveBeenCalledWith(pendingRegistration);
    expect(
      applicationRegistrationService.updateFromManifest,
    ).not.toHaveBeenCalled();
  });
});
