export async function withResolvedAtelier<T>(
  atelierId: string | null | undefined,
  write: (resolvedAtelierId: string) => Promise<T>,
): Promise<T> {
  const resolvedAtelierId = atelierId?.trim();
  if (!resolvedAtelierId) {
    throw new Error('atelier_not_resolved');
  }
  return write(resolvedAtelierId);
}
