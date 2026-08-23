export const MAX_TEXT_CHARS = 5000;
export const MAX_TTS_CHARS = 1000;
export const MAX_AUDIO_BASE64_CHARS = 12_000_000;

export function contentLengthTooLarge(req: Request, maxBytes: number): boolean {
  const length = Number(req.headers.get("content-length") || 0);
  return Number.isFinite(length) && length > maxBytes;
}

export function isTextWithinLimit(value: string, maxChars: number): boolean {
  return value.length > 0 && value.length <= maxChars;
}
