/**
 * The sub-path the app is served under ("" at the root, "/kingsol" behind the proxy).
 * Next.js applies it to <Link>, redirects and assets automatically; use `withBase` only for
 * hand-written URLs such as fetch() and sendBeacon calls.
 */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

export const withBase = (path: string) => `${BASE_PATH}${path}`;
