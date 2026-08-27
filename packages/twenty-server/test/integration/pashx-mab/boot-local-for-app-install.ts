/**
 * Boots the Twenty server locally so the PashX app can be installed into the CL2 target database.
 *
 * Why this exists: the CL2 suite drives the real HTTP boundary and reads the resulting rows, so the
 * workspace must already contain the PashX objects. Installing them requires a server that is
 * serving the TEST database — the deployed pilot server serves `twenty`, not `twenty_test`, so it
 * cannot be used for this.
 *
 * This mirrors `test/integration/utils/setup-test.ts` deliberately: same `createApp`, same port, so
 * the app the installer talks to is the same app the suite will exercise. It differs only in that it
 * stays up until killed instead of handing control to Jest.
 *
 * DOES NOT WORK UNDER BARE ts-node. Booting this way fails immediately with
 *   export const STANDARD_ERROR_MESSAGE = msg`An error occurred.`;
 *   TypeError: (0 , macro_1.msg) is not a function
 * because `msg` is a Lingui MACRO that requires a compile-time transform. Jest applies that
 * transform through `jest-integration.config.ts`; `ts-node -r tsconfig-paths/register` does not, so
 * the constant evaluates to a call on a non-function at import time.
 *
 * Consequence for CL2: the server can only be booted locally through Jest's transform pipeline. The
 * app install must therefore run either inside a Jest spec (so it inherits the transform) or from a
 * built `dist`. Keeping this file as the record of that constraint — do not "fix" it by adding
 * ts-node plugins without checking what else the Jest transform chain provides.
 *
 * Attempted run (fails):
 *   NODE_ENV=test npx ts-node -r tsconfig-paths/register \
 *     test/integration/pashx-mab/boot-local-for-app-install.ts
 *
 * Reads `.env.test`, which for CL2 points at Cloud SQL `twenty_test` through the IAP/SSH tunnel and
 * at a dedicated test Redis. Nothing here touches the pilot database.
 */
import dotenv from 'dotenv';

import { createApp } from '../utils/create-app';

const PORT = 4000;

const main = async (): Promise<void> => {
  dotenv.config({ path: '.env.test', override: true });

  const app = await createApp({});

  await app.listen(PORT);

  // eslint-disable-next-line no-console
  console.log(
    `[cl2] server listening on http://localhost:${PORT} (database from .env.test)`,
  );

  const shutdown = async (): Promise<void> => {
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(
    '[cl2] boot failed:',
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
