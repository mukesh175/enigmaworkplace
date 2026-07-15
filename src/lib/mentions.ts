function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractMentionedUserIds(
  content: string,
  users: { id: string; name: string }[]
): string[] {
  const ids = new Set<string>();
  for (const u of users) {
    if (!u.name) continue;
    const pattern = new RegExp(`@${escapeRegExp(u.name)}\\b`, "i");
    if (pattern.test(content)) ids.add(u.id);
  }
  return Array.from(ids);
}
