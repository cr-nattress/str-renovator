/** Extracts a safe error message from an unknown caught value */
export function serializeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
