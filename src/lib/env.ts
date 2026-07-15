// process.env.NEXTAUTH_URL is used to build OAuth redirect_uri values, which
// providers compare byte-for-byte against what's registered in their console.
// A trailing slash on the env var (e.g. "https://example.com/") combined with
// a leading slash in the path we append produces "https://example.com//..."
// — a silent double slash that causes redirect_uri_mismatch even though the
// registered URI and the env var both "look" correct on their own. Always
// build redirect/callback URLs through this helper instead of using
// process.env.NEXTAUTH_URL directly.
export function siteUrl(path: string = ""): string {
  const base = (process.env.NEXTAUTH_URL || "").replace(/\/+$/, "");
  const cleanPath = path ? `/${path.replace(/^\/+/, "")}` : "";
  return `${base}${cleanPath}`;
}
