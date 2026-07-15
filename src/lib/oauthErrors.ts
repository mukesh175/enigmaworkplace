// Google's token endpoint returns JSON like { "error": "invalid_grant", "error_description": "..." }.
// We surface a short, safe reason (no tokens/secrets are ever in these fields) instead of a
// generic "token_exchange_failed" so an admin can actually diagnose config issues from the
// Settings page without digging through server logs.
export function extractGoogleErrorReason(rawBody: string): string {
  try {
    const parsed = JSON.parse(rawBody);
    const reason = parsed.error_description || parsed.error || "token_exchange_failed";
    return String(reason).slice(0, 200);
  } catch {
    return rawBody.slice(0, 200) || "token_exchange_failed";
  }
}

// Meta's Graph API returns JSON like { "error": { "message": "...", "type": "...", "code": ... } }.
export function extractMetaErrorReason(rawBody: string): string {
  try {
    const parsed = JSON.parse(rawBody);
    const reason = parsed?.error?.message || parsed?.error?.type || "token_exchange_failed";
    return String(reason).slice(0, 200);
  } catch {
    return rawBody.slice(0, 200) || "token_exchange_failed";
  }
}
