const DEFAULT_TTL_MS = 3600_000;

interface CacheEntry {
  html: string;
  expiresAt: number;
  tags: Set<string>;
}

const ssrCache = new Map<string, CacheEntry>();

function getTtlMs(): number {
  const parsed = Number(process.env["SSR_CACHE_TTL_MS"] ?? DEFAULT_TTL_MS);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TTL_MS;
  }
  return parsed;
}

export function buildSsrCacheKey(params: {
  location: string;
  activeUserId: string | null;
}): string {
  const audience = params.activeUserId ?? "guest";
  return `${audience}:${params.location}`;
}

export function getSsrCacheTags(params: {
  location: string;
  activeUserId: string | null;
}): string[] {
  const url = new URL(params.location, "http://localhost");
  const pathname = url.pathname;

  const tags = new Set<string>([
    `audience:${params.activeUserId ?? "guest"}`,
    "domain:global",
  ]);

  if (pathname === "/") {
    tags.add("route:/");
    tags.add("domain:posts");
    tags.add("domain:search");
  } else if (/^\/posts\/[^/]+$/.test(pathname)) {
    const postId = pathname.split("/")[2] ?? "";
    tags.add("route:/posts");
    tags.add("domain:posts");
    tags.add("domain:search");
    if (postId !== "") {
      tags.add(`post:${postId}`);
    }
  } else if (/^\/users\/[^/]+$/.test(pathname)) {
    const username = pathname.split("/")[2] ?? "";
    tags.add("route:/users");
    tags.add("domain:users");
    tags.add("domain:posts");
    if (username !== "") {
      tags.add(`user:${username}`);
    }
  } else if (pathname === "/search") {
    tags.add("route:/search");
    tags.add("domain:search");
    tags.add("domain:posts");
  } else if (pathname === "/dm" || /^\/dm\/[^/]+$/.test(pathname)) {
    tags.add("route:/dm");
    tags.add("domain:dm");
  } else if (pathname === "/terms") {
    tags.add("route:/terms");
  } else if (pathname === "/crok") {
    tags.add("route:/crok");
  }

  return [...tags];
}

export function getCachedSsrHtml(cacheKey: string): string | null {
  const cached = ssrCache.get(cacheKey);
  if (cached == null) {
    return null;
  }

  if (Date.now() >= cached.expiresAt) {
    ssrCache.delete(cacheKey);
    return null;
  }

  return cached.html;
}

export function setCachedSsrHtml(params: {
  cacheKey: string;
  html: string;
  tags: string[];
}): void {
  ssrCache.set(params.cacheKey, {
    html: params.html,
    expiresAt: Date.now() + getTtlMs(),
    tags: new Set(params.tags),
  });
}

export function invalidateAllSsrCache(): void {
  ssrCache.clear();
}

export function invalidateSsrCacheByTags(tags: string[]): void {
  if (tags.length === 0) {
    return;
  }

  const tagSet = new Set(tags);
  for (const [cacheKey, cacheEntry] of ssrCache.entries()) {
    for (const tag of cacheEntry.tags) {
      if (tagSet.has(tag)) {
        ssrCache.delete(cacheKey);
        break;
      }
    }
  }
}

export function getInvalidationTagsForApiWrite(params: {
  apiPath: string;
  activeUser?: { id?: string; username?: string } | null;
}): string[] | "all" {
  const { apiPath, activeUser } = params;

  if (apiPath === "/initialize") {
    return "all";
  }

  if (
    
  
    apiPath === "/signin" || apiPath === "/signup" || apiPath === "/signout"
  ) {
    return "all";
  }

  if (apiPath === "/posts") {
    const tags = ["domain:posts", "domain:search", "route:/"];
    if (activeUser?.username != null) {
      tags.push(`user:${activeUser.username}`);
    }
    return tags;
  }

  if (apiPath === "/me" || apiPath === "/me/profile-image") {
    const tags = ["domain:users", "domain:posts", "domain:search"];
    if (activeUser?.username != null) {
      tags.push(`user:${activeUser.username}`);
    }
    if (activeUser?.id != null) {
      tags.push(`audience:${activeUser.id}`);
    }
    return tags;
  }

  if (apiPath === "/dm" || /^\/dm\/[^/]+\/messages$/.test(apiPath)) {
    return ["domain:dm", "audience:guest"];
  }

  if (/^\/dm\/[^/]+\/(read|typing)$/.test(apiPath)) {
    return [];
  }

  if (apiPath === "/images" || apiPath === "/movies" || apiPath === "/sounds") {
    return ["domain:posts", "domain:search"];
  }

  return [];
}
