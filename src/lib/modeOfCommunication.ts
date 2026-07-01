export const MODES = ["Phone", "Online Meet", "Physical"] as const;
export const ADMIN_ONLY_MODE = "Message" as const;
export const ADMIN_MODES = [...MODES, ADMIN_ONLY_MODE] as const;

/**
 * Canonicalizes a mode-of-communication string regardless of letter case
 * (e.g. "phone", "PHONE" -> "Phone"). "Online" is accepted as an alias for
 * "Online Meet". "Message" only normalizes when allowMessage is set, since
 * it's an admin-only option — otherwise the raw value is returned as-is so
 * it fails the normal validation/enum check.
 */
export function normalizeMode(raw: string, allowMessage: boolean): string {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "phone") return "Phone";
  if (v === "online" || v === "online meet") return "Online Meet";
  if (v === "physical") return "Physical";
  if (allowMessage && v === "message") return ADMIN_ONLY_MODE;
  return (raw ?? "").trim();
}
