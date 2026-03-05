/**
 * Client-side media override loader.
 *
 * Fetches image overrides from /api/media/[slot].
 * If an override exists, returns the Blob URL.
 * If not (404), returns null so the caller keeps the static fallback.
 *
 * Results are cached in-memory for the page session to avoid redundant fetches.
 */

const cache = new Map<string, string | null>();
const pending = new Map<string, Promise<string | null>>();

export async function getImageOverride(slot: string): Promise<string | null> {
  if (cache.has(slot)) return cache.get(slot) ?? null;
  if (pending.has(slot)) return pending.get(slot) ?? null;

  const promise = fetch(`/api/media/${encodeURIComponent(slot)}`)
    .then((res) => {
      if (!res.ok) {
        cache.set(slot, null);
        return null;
      }
      return res.json() as Promise<{ url: string; altText?: string | null }>;
    })
    .then((data) => {
      if (!data) return null;
      cache.set(slot, data.url);
      return data.url;
    })
    .catch(() => {
      cache.set(slot, null);
      return null;
    })
    .finally(() => {
      pending.delete(slot);
    });

  pending.set(slot, promise);
  return promise;
}

/**
 * Fetch overrides for multiple slots in parallel.
 * Returns a map of slot -> Blob URL for slots that have overrides.
 */
export async function getImageOverrides(
  slots: string[]
): Promise<Record<string, string>> {
  const results = await Promise.all(
    slots.map(async (slot) => {
      const url = await getImageOverride(slot);
      return [slot, url] as const;
    })
  );

  const overrides: Record<string, string> = {};
  for (const [slot, url] of results) {
    if (url) overrides[slot] = url;
  }
  return overrides;
}
