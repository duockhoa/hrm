type CatalogRefresher = () => Promise<unknown>;

const refreshers = new Map<string, Set<CatalogRefresher>>();

export function registerItemCatalogRefresh(
  url: string,
  refresh: CatalogRefresher,
) {
  const callbacks = refreshers.get(url) ?? new Set<CatalogRefresher>();
  callbacks.add(refresh);
  refreshers.set(url, callbacks);
  return () => {
    callbacks.delete(refresh);
    if (!callbacks.size) refreshers.delete(url);
  };
}

export async function refreshItemCatalog(url: string) {
  await Promise.all(
    Array.from(refreshers.get(url) ?? [], (refresh) => refresh()),
  );
}
