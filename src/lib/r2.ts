/**
 * Cloudflare R2 helpers.
 *
 * Two supported modes:
 *  1. PUBLIC  — PDFs are added via their public R2 links (https://pub-xxx.r2.dev/... or custom domain).
 *               The URL is passed straight through to the reader proxy.
 *  2. PRIVATE — R2 credentials are set; the admin saves an object key and the server
 *               signs short-lived GET requests against the S3 API so the browser never
 *               learns the bucket URL.
 */

export type R2Mode = "public" | "private";

export function r2Mode(): R2Mode {
  return process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_ACCOUNT_ID
    ? "private"
    : "public";
}

export function isR2Configured(): boolean {
  return r2Mode() === "private";
}

/**
 * Normalise a part reference stored in the DB:
 *  - PUBLIC mode: pdfUrl holds the full https URL.
 *  - PRIVATE mode: pdfKey holds "series/part.pdf" and pdfUrl may hold the public base.
 * Returns the URL to fetch server-side.
 */
export function resolvePdfUrl(pdfUrl: string, pdfKey?: string | null): string {
  if (pdfKey && isR2Configured()) {
    return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${pdfKey}`;
  }
  return pdfUrl;
}

/** Extract an object key from an R2 public link if the host looks like R2. */
export function keyFromPublicUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!/(^|\.)r2\.dev$/.test(u.hostname) && !/\.r2\.cloudflarestorage\.com$/.test(u.hostname)) return null;
    const key = u.pathname.replace(/^\/+/, "");
    return key || null;
  } catch {
    return null;
  }
}

/** Basic validation for URLs added from the admin dashboard (http allowed for localhost/127.0.0.1 so local sample PDFs work). */
export function isValidHttpsUrl(s: string): boolean {
  try {
    const u = new URL(s);
    const isLocal = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    return u.protocol === "https:" || (isLocal && u.protocol === "http:");
  } catch {
    return false;
  }
}
