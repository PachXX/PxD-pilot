declare module '@file-type/pdf' {
  import { type Detector } from 'file-type';

  export const detectPdf: Detector;
}

declare module '@lingui/message-utils/compileMessage' {
  type CompiledIcuChoices = Record<string, CompiledMessage> & {
    offset: number | undefined;
  };
  type CompiledMessageToken =
    | string
    | [
        name: string,
        type?: string,
        format?: null | string | unknown | CompiledIcuChoices,
      ];
  type CompiledMessage = CompiledMessageToken[];
  type MapText = (value: string) => string;

  export function compileMessage(
    message: string,
    mapText?: MapText,
  ): CompiledMessage;

  export function compileMessageOrThrow(
    message: string,
    mapText?: MapText,
  ): CompiledMessage;
}
