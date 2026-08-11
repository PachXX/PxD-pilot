import { type PashxCommandExceptionCode } from 'pashx-mab-contract';

export class PashxMabException extends Error {
  constructor(
    readonly code: PashxCommandExceptionCode,
    readonly fieldPaths: readonly string[] = [],
    readonly currentVersion?: number,
  ) {
    super(code);
    this.name = PashxMabException.name;
  }
}
