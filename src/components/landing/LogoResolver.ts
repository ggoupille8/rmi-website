// LogoResolver.ts — Cascading multi-source logo resolver
// Resolution chain: self-hosted → Google gstatic (128px) → icon.horse → initials fallback

interface LogoSource {
  name: string;
  getUrl: (domain: string) => string;
}

// Known self-hosted logo slugs (add entries here to override external sources)
const SELF_HOSTED_SLUGS: Set<string> = new Set([
  // e.g. 'ford' → /images/clients/ford.png
]);

const EXTERNAL_SOURCES: LogoSource[] = [
  {
    name: 'google-gstatic',
    getUrl: (domain) =>
      `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`,
  },
  {
    name: 'icon-horse',
    getUrl: (domain) => `https://icon.horse/icon/${domain}`,
  },
];

// In-memory cache: domain → resolved URL or null (persists for session)
const logoCache = new Map<string, string | null>();

function domainToSlug(domain: string): string {
  return domain.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]/gi, '-').toLowerCase();
}

function getSelfHostedUrl(domain: string): string | null {
  const slug = domainToSlug(domain);
  if (SELF_HOSTED_SLUGS.has(slug)) {
    return `/images/clients/${slug}.png`;
  }
  return null;
}

/** Minimum pixel dimension to consider a logo usable (reject tiny favicons) */
const MIN_LOGO_SIZE = 48;

function testImageLoad(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const settle = (value: boolean) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };
    img.onload = () =>
      settle(img.naturalWidth >= MIN_LOGO_SIZE && img.naturalHeight >= MIN_LOGO_SIZE);
    img.onerror = () => settle(false);
    img.referrerPolicy = 'no-referrer';
    img.src = url;
    setTimeout(() => settle(false), 5000);
  });
}

export async function resolveLogo(domain: string): Promise<string | null> {
  if (logoCache.has(domain)) return logoCache.get(domain) ?? null;

  // 1. Check self-hosted override
  const selfHosted = getSelfHostedUrl(domain);
  if (selfHosted) {
    const loaded = await testImageLoad(selfHosted);
    if (loaded) {
      logoCache.set(domain, selfHosted);
      return selfHosted;
    }
  }

  // 2. Try external sources in order
  for (const source of EXTERNAL_SOURCES) {
    const url = source.getUrl(domain);
    const loaded = await testImageLoad(url);
    if (loaded) {
      logoCache.set(domain, url);
      return url;
    }
  }

  // 3. All sources failed
  logoCache.set(domain, null);
  return null;
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => !['&', 'and', 'the', 'of'].includes(w.toLowerCase()))
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);
}
