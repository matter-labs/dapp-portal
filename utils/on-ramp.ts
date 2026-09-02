/**
 * Validates the public `?redirect=` query of the on-ramp page before it is used as a navigation target.
 *
 * The value comes from whoever wrote the link to the portal, so it is only accepted as an absolute
 * `https://` URL without credentials. Everything else - executable schemes (`javascript:`, `data:`, ...),
 * relative and protocol-relative values, repeated query parameters - is rejected.
 *
 * Note this still allows a return to any https host: the integrator is not authenticated. Binding the
 * return target to the on-ramp session (or an allowlist of integrator origins) is the proper fix and is
 * a prerequisite for re-enabling the on-ramp page.
 *
 * @returns the parsed URL, or `null` when the value must not be navigated to
 */
export function parseOnRampRedirectUrl(value: unknown): URL | null {
  if (typeof value !== "string") return null;

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;

  return url;
}
