const PAGE_SIZE = 1000;

/**
 * Supabase returns at most 1000 rows per request, so anything that can grow
 * past that (workouts, per-exercise history, daily measurements) is read in
 * pages. The query must have a stable order, or rows could repeat or go missing.
 */
export async function readAllPages<T>(
  context: string,
  readPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await readPage(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Could not load ${context}: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < PAGE_SIZE) return rows;
  }
}
