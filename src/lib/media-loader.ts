/**
 * Client-side media override loader.
 *
 * Fetches image overrides from /api/media/[slot].
 * If an override exists, returns the Blob URL and optional responsive variants.
 * If not (404), returns null so the caller keeps the static fallback.
 *
 * Results are cached in-memory for the page session to avoid redundant fetches.
 */

export interface MediaOverride {
  url: string;
  altText?: string | null;
  variants?: Record<string, string>;
}

const cache = new Map<string, MediaOverride | null>();
const pending = new Map<string, Promise<MediaOverride | null>>();

export async function getMediaOverride(slot: string): Promise<MediaOverride | null> {
  if (cache.has(slot)) return cache.get(slot) ?? null;
  if (pending.has(slot)) return pending.get(slot) ?? null;

  const promise = fetch(`/api/media/${encodeURIComponent(slot)}`)
    .then((res) => {
      if (!res.ok) {
        cache.set(slot, null);
        return null;
      }
      return res.json() as Promise<{ url: string; altText?: string | null; variants?: Record<string, string> }>;
    })
    .then((data) => {
      if (!data) return null;
      const override: MediaOverride = {
        url: data.url,
        altText: data.altText,
        variants: data.variants,
      };
      cache.set(slot, override);
      return override;
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
 * Backward-compatible: returns just the URL string.
 */
export async function getImageOverride(slot: string): Promise<string | null> {
  const override = await getMediaOverride(slot);
  return override?.url ?? null;
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

/**
 * Fetch full overrides (including variants) for multiple slots.
 * Returns a map of slot -> MediaOverride for slots that have overrides.
 */
export async function getMediaOverrides(
  slots: string[]
): Promise<Record<string, MediaOverride>> {
  const results = await Promise.all(
    slots.map(async (slot) => {
      const override = await getMediaOverride(slot);
      return [slot, override] as const;
    })
  );

  const overrides: Record<string, MediaOverride> = {};
  for (const [slot, override] of results) {
    if (override) overrides[slot] = override;
  }
  return overrides;
}
