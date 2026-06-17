export type CursorPageParams = {
  limit: number;
  cursor: string | null;
};

export function parseCursorPageParams(
  request: Request,
  opts?: { defaultLimit?: number; maxLimit?: number },
): CursorPageParams {
  const url = new URL(request.url);
  const maxLimit = opts?.maxLimit ?? 200;
  const defaultLimit = opts?.defaultLimit ?? 50;

  const rawLimit = url.searchParams.get("limit") ?? url.searchParams.get("take");
  const parsedLimit = rawLimit ? Number(rawLimit) : defaultLimit;
  const limit = Number.isFinite(parsedLimit)
    ? Math.max(1, Math.min(maxLimit, Math.trunc(parsedLimit)))
    : defaultLimit;

  const cursor = url.searchParams.get("cursor");
  return { limit, cursor: cursor && cursor.trim() ? cursor.trim() : null };
}

export function cursorFindManyArgs(params: CursorPageParams) {
  const take = params.limit + 1;
  const cursor = params.cursor ? { id: params.cursor } : undefined;
  const skip = params.cursor ? 1 : undefined;
  return { take, cursor, skip };
}

export function toCursorPage<T extends { id: string }>(items: T[], limit: number) {
  const page = items.slice(0, limit);
  const hasMore = items.length > limit;
  const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;
  return { page, pageInfo: { nextCursor, hasMore } };
}
