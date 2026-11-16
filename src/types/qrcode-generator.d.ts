declare module 'qrcode-generator' {
  interface QrCode {
    addData(data: string, mode?: string): void;
    make(): void;
    getModuleCount(): number;
    isDark(row: number, column: number): boolean;
    createSvgTag(options?: Record<string, unknown>): string;
  }

  export default function qrcode(
    typeNumber: number,
    errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H',
  ): QrCode;
}
