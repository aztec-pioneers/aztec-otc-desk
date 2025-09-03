/**
 * Generate a simple UUID v4
 */
export function generateOrderId(): string {
  return crypto.randomUUID();
}
